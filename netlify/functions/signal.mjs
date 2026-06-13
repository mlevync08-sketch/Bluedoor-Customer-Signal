const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Signal-Token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const SIGNAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    meta: {
      type: 'object',
      additionalProperties: false,
      properties: {
        scan_name: { type: 'string' },
        generated_at: { type: 'string' },
        query: { type: 'string' },
        scope: { type: 'string' },
        methodology: { type: 'string' }
      },
      required: ['scan_name', 'generated_at', 'query', 'scope', 'methodology']
    },
    summary: {
      type: 'object',
      additionalProperties: false,
      properties: {
        executive_brief: { type: 'string' },
        total_companies_found: { type: 'number' },
        hot_leads: { type: 'number' },
        average_score: { type: 'number' },
        strongest_pattern: { type: 'string' }
      },
      required: ['executive_brief', 'total_companies_found', 'hot_leads', 'average_score', 'strongest_pattern']
    },
    companies: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          company: { type: 'string' },
          website: { type: 'string' },
          hq: { type: 'string' },
          employee_range: { type: 'string' },
          stage: { type: 'string' },
          sector: { type: 'string' },
          signal_type: { type: 'string' },
          signal_date: { type: 'string' },
          signal_summary: { type: 'string' },
          funding_momentum_score: { type: 'number' },
          leadership_signal_score: { type: 'number' },
          hiring_velocity_score: { type: 'number' },
          icp_fit_score: { type: 'number' },
          strategic_fit_score: { type: 'number' },
          total_score: { type: 'number' },
          priority: { type: 'string' },
          package_map: { type: 'string' },
          why_it_matters: { type: 'string' },
          recommended_first_outreach: { type: 'string' },
          next_action: { type: 'string' },
          confidence: { type: 'string' },
          caveats: { type: 'string' },
          evidence_links: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                title: { type: 'string' },
                url: { type: 'string' },
                source_type: { type: 'string' }
              },
              required: ['title', 'url', 'source_type']
            }
          }
        },
        required: [
          'company',
          'website',
          'hq',
          'employee_range',
          'stage',
          'sector',
          'signal_type',
          'signal_date',
          'signal_summary',
          'funding_momentum_score',
          'leadership_signal_score',
          'hiring_velocity_score',
          'icp_fit_score',
          'strategic_fit_score',
          'total_score',
          'priority',
          'package_map',
          'why_it_matters',
          'recommended_first_outreach',
          'next_action',
          'confidence',
          'caveats',
          'evidence_links'
        ]
      }
    }
  },
  required: ['meta', 'summary', 'companies']
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed. Use POST.' });
  }

  const adminToken = process.env.SIGNAL_ADMIN_TOKEN;
  const providedToken = event.headers['x-signal-token'] || event.headers['X-Signal-Token'];
  if (adminToken && providedToken !== adminToken) {
    return json(401, { error: 'Unauthorized. Set the matching X-Signal-Token in the dashboard.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return json(500, {
      error: 'Missing OPENAI_API_KEY. Add it in Netlify environment variables with Functions scope, then redeploy.'
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON request body.' });
  }

  const request = normalizeRequest(body);
  if (!request.query) {
    return json(400, { error: 'Missing query.' });
  }

  try {
    const payload = await callOpenAI(request);
    const normalized = normalizeScan(payload, request);
    return json(200, normalized);
  } catch (error) {
    console.error('Signal scan error', error);
    return json(500, {
      error: error.message || 'Signal scan failed. Check function logs for details.'
    });
  }
};

function normalizeRequest(body) {
  const limit = Math.max(5, Math.min(Number(body.limit || 15), 25));
  return {
    query: String(body.query || '').trim(),
    region: String(body.region || 'Global').trim(),
    sector: String(body.sector || 'Digital health, health tech, healthcare transformation').trim(),
    employeeMin: Number(body.employeeMin || 50),
    employeeMax: Number(body.employeeMax || 1000),
    stage: String(body.stage || 'Series A-C / growth').trim(),
    limit
  };
}

async function callOpenAI(request) {
  const model = process.env.OPENAI_MODEL || 'gpt-4.1';

  const instructions = `You are the Bluedoor Customer Signal analyst. Your job is to run a live market scan and produce business intelligence for Bluedoor, a healthcare and life-sciences growth agency.

Bluedoor's strongest target profile:
- Digital health, health tech, healthcare AI, health transformation, payer/provider infrastructure, or healthcare services innovation.
- Series A-C or similar post-revenue growth stage.
- Target employee range is usually 50-1000, but flag caveats if the company is outside range.
- The strongest buying moment is a commercial inflection point: new CRO, CMO, Head of Growth, VP Marketing, VP Product Marketing, VP RevOps, VP Sales, Chief Commercial Officer, major funding, expansion, new product launch, or active GTM hiring.

Scoring weights:
- leadership_signal_score: 0-40. New GTM/product/commercial leadership, turnover, first senior hire, or expansion trigger.
- icp_fit_score: 0-20. Fit against sector, stage, employee range, buyer complexity, and post-revenue maturity.
- funding_momentum_score: 0-10. Recent funding, acquisition, strategic investment, or credible capital signal.
- hiring_velocity_score: 0-20. Open GTM/product/customer roles, geographic expansion, channel expansion, enterprise sales buildout.
- strategic_fit_score: 0-10. Clear need for Bluedoor's differentiated offers.

Package map options:
- Buyer Journey Map
- Sales Enablement Portfolio
- Category Narrative
- Founder-led GTM to Repeatable Pipeline
- Product Marketing Sprint
- Customer Evidence/ROI
- RevOps/GTM Infrastructure
- Discovery Sprint

Rules:
- Use current web evidence.
- Do not fabricate sources, headcount, funding, or hiring facts.
- If evidence is incomplete, still score the company, but reduce confidence and add caveats.
- Prefer source URLs from company pages, careers pages, funding announcements, reputable business databases, press releases, or credible news sources.
- Return exactly the requested JSON schema. No markdown.`;

  const userInput = `Run this Bluedoor Customer Signal scan.

Query: ${request.query}
Region: ${request.region}
Sector focus: ${request.sector}
Employee range: ${request.employeeMin}-${request.employeeMax}
Stage: ${request.stage}
Number of companies requested: ${request.limit}

Find and rank the best companies. Include evidence links and a recommended first outreach angle for each.`;

  const requestBody = {
   model,
   tools: [{ type: 'web_search_preview' }],
   tool_choice: 'required',
   input: [
     { role: 'developer', content: instructions },
     { role: 'user', content: userInput }
   ],
    text: {
      format: {
        type: 'json_schema',
        name: 'bluedoor_customer_signal_scan',
        strict: true,
        schema: SIGNAL_SCHEMA
      }
    },
    max_output_tokens: 7000
  };

  if (/^(gpt-5|o1|o3|o4)/i.test(model)) {
    requestBody.reasoning = { effort: 'low' };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`OpenAI returned non-JSON response: ${raw.slice(0, 300)}`);
  }

  if (!response.ok) {
    const message = data?.error?.message || data?.error || raw;
    throw new Error(`OpenAI API error: ${message}`);
  }

  const text = extractOutputText(data);
  if (!text) {
    throw new Error('OpenAI returned no output_text. Try lowering the company limit or check model/tool access.');
  }

  try {
    return JSON.parse(stripCodeFence(text));
  } catch (error) {
    console.error('Could not parse model output', text);
    throw new Error(`Could not parse model JSON: ${error.message}`);
  }
}

function extractOutputText(data) {
  if (data.output_text) return data.output_text;

  const chunks = [];
  for (const item of data.output || []) {
    if (item.type === 'message') {
      for (const content of item.content || []) {
        if (content.type === 'output_text' && content.text) chunks.push(content.text);
        if (content.type === 'text' && content.text) chunks.push(content.text);
      }
    }
  }
  return chunks.join('\n').trim();
}

function stripCodeFence(text) {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function normalizeScan(scan, request) {
  const companies = (scan.companies || [])
    .map((company) => {
      const funding = clamp(company.funding_momentum_score, 0, 10);
      const leadership = clamp(company.leadership_signal_score, 0, 40);
      const hiring = clamp(company.hiring_velocity_score, 0, 20);
      const icp = clamp(company.icp_fit_score, 0, 20);
      const strategic = clamp(company.strategic_fit_score, 0, 10);
      const total = clamp(Math.round(company.total_score || funding + leadership + hiring + icp + strategic), 0, 100);
      return {
        ...company,
        funding_momentum_score: funding,
        leadership_signal_score: leadership,
        hiring_velocity_score: hiring,
        icp_fit_score: icp,
        strategic_fit_score: strategic,
        total_score: total,
        evidence_links: Array.isArray(company.evidence_links) ? company.evidence_links : []
      };
    })
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, request.limit);

  const hotLeads = companies.filter((company) => company.total_score >= 80 || /hot/i.test(company.priority || '')).length;
  const average = companies.length
    ? Math.round(companies.reduce((sum, company) => sum + company.total_score, 0) / companies.length)
    : 0;

  return {
    meta: {
      ...scan.meta,
      generated_at: new Date().toISOString(),
      query: request.query,
      scope: `${request.region}; ${request.sector}; ${request.stage}; ${request.employeeMin}-${request.employeeMax} employees`
    },
    summary: {
      ...scan.summary,
      total_companies_found: companies.length,
      hot_leads: hotLeads,
      average_score: average
    },
    companies
  };
}

function clamp(value, min, max) {
  const number = Number(value || 0);
  return Math.max(min, Math.min(max, number));
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body)
  };
}
