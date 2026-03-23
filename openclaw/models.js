// OpenClaw Model Registry v1.1
const MODELS = {
  'llama3.2':       { label:'Llama 3.2',       caps:['code','chat','analysis'],         priority:1,  icon:'🦙' },
  'deepseek-r1':    { label:'DeepSeek R1',      caps:['reasoning','code','math'],        priority:2,  icon:'🔮' },
  'codellama':      { label:'Code Llama',        caps:['code','debug','refactor'],        priority:3,  icon:'💻' },
  'mistral':        { label:'Mistral 7B',        caps:['chat','analysis','creative'],     priority:4,  icon:'🌬' },
  'qwen2.5':        { label:'Qwen 2.5',          caps:['code','multilingual'],            priority:5,  icon:'🔱' },
  'qwen2.5-coder':  { label:'Qwen 2.5 Coder',   caps:['code','completion'],              priority:6,  icon:'⚡' },
  'phi3':           { label:'Phi 3',             caps:['code','chat','efficient'],        priority:7,  icon:'🔬' },
  'gemma2':         { label:'Gemma 2',           caps:['chat','analysis'],               priority:8,  icon:'💫' },
  'starcoder2':     { label:'StarCoder 2',       caps:['code','completion'],              priority:9,  icon:'⭐' },
};

function selectBest(capability, available) {
  return Object.entries(MODELS)
    .filter(([id, m]) => m.caps.includes(capability) && available.includes(id))
    .sort((a, b) => a[1].priority - b[1].priority)[0]?.[0] || available[0];
}

// Safe for both browser <script> and Node require()
if (typeof module !== 'undefined' && module.exports) module.exports = { MODELS, selectBest };
