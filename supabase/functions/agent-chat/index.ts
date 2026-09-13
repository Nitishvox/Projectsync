import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Groq from 'https://esm.sh/groq-sdk@0.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const toolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'createProject',
      description: 'Create a new project for the authenticated user',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name or title of the project' },
          description: { type: 'string', description: 'Short overview of what the project entails' },
          status: {
            type: 'string',
            enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
            description: 'Status of the project',
          },
          startDate: { type: 'string', description: 'ISO date string or YYYY-MM-DD for start date' },
          endDate: { type: 'string', description: 'ISO date string or YYYY-MM-DD for target end date' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'updateProject',
      description: 'Update an existing project owned by the user',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'UUID of the project to update' },
          name: { type: 'string', description: 'Updated project name' },
          description: { type: 'string', description: 'Updated description' },
          status: {
            type: 'string',
            enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
            description: 'Updated project status',
          },
        },
        required: ['projectId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'createTask',
      description: 'Create a new task inside a project',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the task' },
          description: { type: 'string', description: 'Details about the task' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'Priority level' },
          status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] },
          projectId: { type: 'string', description: 'UUID of target project' },
          dueDate: { type: 'string', description: 'ISO date string for task due date' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'completeTask',
      description: 'Mark a task as completed for the authenticated user',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'UUID of the task' },
          taskName: { type: 'string', description: 'Name or partial title of the task if ID unknown' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'listProjects',
      description: 'List user projects, optionally filtered by status',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'listTasks',
      description: 'List user tasks, optionally filtered by status, priority, or project',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Filter tasks by project UUID' },
          status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getDashboardStats',
      description: 'Retrieve real-time aggregate statistics for the user',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

// Simple in-memory sliding rate limiter per user (e.g. max 20 requests per minute)
const rateLimits = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const timestamps = rateLimits.get(userId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);
  if (validTimestamps.length >= 20) {
    return false;
  }
  validTimestamps.push(now);
  rateLimits.set(userId, validTimestamps);
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY')!;
    const groqApiKey = Deno.env.get('GROQ_API_KEY')!;

    // Create service client to securely inspect user and execute scoped mutations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '').trim();
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired JWT' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    if (!checkRateLimit(userId)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, conversationHistory = [] } = await req.json();
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Persist incoming user message to chat_messages
    try {
      await supabaseAdmin.from('chat_messages').insert({
        user_id: userId,
        role: 'user',
        content: message,
      });
    } catch (e) {
      console.warn('Could not persist user message:', e);
    }

    const groq = new Groq({ apiKey: groqApiKey });

    // Prepare system and history context
    const messages: any[] = [
      {
        role: 'system',
        content: `You are Momentum Copilot, an intelligent project and task management assistant.
You are assisting user ID ${userId}.
You can create projects, update projects, create tasks, complete tasks, list items, and get live dashboard metrics.
Always invoke the matching tool when requested to take action or inspect data.
Execute actions on behalf of the user faithfully and provide a concise, friendly confirmation.`,
      },
    ];

    if (Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-6)) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: 'user', content: message });

    // Step 1: Call Groq with tool definitions
    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages,
      tools: toolDefinitions,
      tool_choice: 'auto',
    });

    const choice = completion.choices[0];
    const toolCalls = choice?.message?.tool_calls;

    let assistantReply = choice?.message?.content || '';
    let toolCallData: any = null;

    if (toolCalls && toolCalls.length > 0) {
      toolCallData = toolCalls;
      const followUpMessages = [...messages, choice.message];

      for (const toolCall of toolCalls) {
        const fnName = toolCall.function.name;
        let args: any = {};
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          args = {};
        }

        let result: any = { error: 'Unknown tool' };

        // CRITICAL: Every tool strictly enforces user_id = userId
        if (fnName === 'getDashboardStats') {
          const { data: statsData, error: statsErr } = await supabaseAdmin
            .from('dashboard_stats')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (!statsErr && statsData) {
            result = statsData;
          } else {
            // Fallback aggregate
            const { data: pList } = await supabaseAdmin.from('projects').select('id, status').eq('user_id', userId);
            const { data: tList } = await supabaseAdmin.from('tasks').select('id, status').eq('user_id', userId);
            const projects = pList || [];
            const tasks = tList || [];
            result = {
              total_projects: projects.length,
              projects_in_progress: projects.filter((p) => p.status === 'IN_PROGRESS').length,
              total_tasks: tasks.length,
              completed_tasks: tasks.filter((t) => t.status === 'COMPLETED').length,
              pending_tasks: tasks.filter((t) => t.status !== 'COMPLETED').length,
            };
          }
        } else if (fnName === 'createProject') {
          const { data, error } = await supabaseAdmin
            .from('projects')
            .insert({
              name: args.name?.trim(),
              description: args.description || null,
              status: args.status || 'NOT_STARTED',
              start_date: args.startDate ? new Date(args.startDate) : null,
              end_date: args.endDate ? new Date(args.endDate) : null,
              user_id: userId,
            })
            .select()
            .single();
          result = error ? { error: error.message } : { success: true, project: data };
        } else if (fnName === 'updateProject') {
          const updatePayload: any = {};
          if (args.name) updatePayload.name = args.name.trim();
          if (args.description !== undefined) updatePayload.description = args.description;
          if (args.status) updatePayload.status = args.status;

          const { data, error } = await supabaseAdmin
            .from('projects')
            .update(updatePayload)
            .eq('id', args.projectId)
            .eq('user_id', userId)
            .select()
            .single();
          result = error ? { error: error.message } : { success: true, project: data };
        } else if (fnName === 'createTask') {
          // If no projectId given, assign to user's first project
          let targetProjectId = args.projectId;
          if (!targetProjectId) {
            const { data: defaultProject } = await supabaseAdmin
              .from('projects')
              .select('id')
              .eq('user_id', userId)
              .order('created_at', { ascending: true })
              .limit(1)
              .maybeSingle();

            if (defaultProject) {
              targetProjectId = defaultProject.id;
            } else {
              // Create a default project
              const { data: newProj } = await supabaseAdmin
                .from('projects')
                .insert({ name: 'General', user_id: userId })
                .select()
                .single();
              targetProjectId = newProj?.id;
            }
          }

          const { data, error } = await supabaseAdmin
            .from('tasks')
            .insert({
              project_id: targetProjectId,
              name: args.name?.trim(),
              description: args.description || null,
              priority: args.priority || 'MEDIUM',
              status: args.status || 'PENDING',
              due_date: args.dueDate ? new Date(args.dueDate) : null,
              user_id: userId,
            })
            .select()
            .single();
          result = error ? { error: error.message } : { success: true, task: data };
        } else if (fnName === 'completeTask') {
          if (args.taskId) {
            const { data, error } = await supabaseAdmin
              .from('tasks')
              .update({ status: 'COMPLETED' })
              .eq('id', args.taskId)
              .eq('user_id', userId)
              .select()
              .single();
            result = error ? { error: error.message } : { success: true, completedTask: data };
          } else if (args.taskName) {
            const { data: matchedTasks } = await supabaseAdmin
              .from('tasks')
              .select('id, name')
              .eq('user_id', userId)
              .ilike('name', `%${args.taskName.trim()}%`)
              .neq('status', 'COMPLETED')
              .limit(1);

            const targetTask = matchedTasks?.[0];
            if (targetTask) {
              const { data, error } = await supabaseAdmin
                .from('tasks')
                .update({ status: 'COMPLETED' })
                .eq('id', targetTask.id)
                .select()
                .single();
              result = error ? { error: error.message } : { success: true, completedTask: data };
            } else {
              result = { success: false, message: `No pending task matching "${args.taskName}" found.` };
            }
          }
        } else if (fnName === 'listProjects') {
          let q = supabaseAdmin.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: false });
          if (args.status) q = q.eq('status', args.status);
          const { data, error } = await q.limit(10);
          result = error ? { error: error.message } : { projects: data };
        } else if (fnName === 'listTasks') {
          let q = supabaseAdmin.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false });
          if (args.projectId) q = q.eq('project_id', args.projectId);
          if (args.status) q = q.eq('status', args.status);
          if (args.priority) q = q.eq('priority', args.priority);
          const { data, error } = await q.limit(15);
          result = error ? { error: error.message } : { tasks: data };
        }

        followUpMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      // Step 2: Final response with natural language
      const finalCompletion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: followUpMessages,
      });
      assistantReply = finalCompletion.choices[0]?.message?.content || 'Action executed successfully!';
    }

    // Persist assistant message to chat_messages
    try {
      await supabaseAdmin.from('chat_messages').insert({
        user_id: userId,
        role: 'assistant',
        content: assistantReply,
        tool_call_data: toolCallData,
      });
    } catch (e) {
      console.warn('Could not persist assistant message:', e);
    }

    return new Response(JSON.stringify({ success: true, data: { reply: assistantReply } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
