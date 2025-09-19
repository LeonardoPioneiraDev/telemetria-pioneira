#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Lista REDUZIDA de nomes de pastas ou arquivos a serem ignorados (apenas os essenciais)
const ignorar = [
  'node_modules', '.git', 'pg_data', 'redis', 'uploads', 'logs', '.turbo',
  'coverage', '.next', 'dist', // Mantendo apenas os mais críticos
  // Removidos: oracle-instantclient, global, _fsm, _vm, etc.
];

// Arquivos específicos a ignorar (apenas os mais críticos)
const arquivosIgnorar = [
  'package-lock.json', 'pnpm-lock.yaml', '.DS_Store', 'Thumbs.db',
  // Removidos: portainer.db, pg_hba.conf, etc.
];

function deveIgnorarCaminho(caminho) {
  const caminhoNormalizado = path.normalize(caminho);
  const segmentos = caminhoNormalizado.split(path.sep);
  const nomeArquivo = path.basename(caminho);
  
  // Ignorar apenas se for um segmento crítico
  const temSegmentoIgnorado = segmentos.some((segmento) => ignorar.includes(segmento));
  
  // Ignorar apenas arquivos críticos
  const arquivoIgnorado = arquivosIgnorar.includes(nomeArquivo);
  
  return temSegmentoIgnorado || arquivoIgnorado;
}

function getFileIcon(caminho, stats) {
  if (stats.isDirectory()) {
    const nome = path.basename(caminho).toLowerCase();
    
    // Ícones específicos para pastas importantes
    if (nome === 'src') return '📂';
    if (nome === 'components') return '🧩';
    if (nome === 'pages') return '📄';
    if (nome === 'services') return '⚙️';
    if (nome === 'hooks') return '🎣';
    if (nome === 'utils') return '🔧';
    if (nome === 'assets') return '🖼️';
    if (nome === 'public') return '��';
    if (nome === 'scripts') return '📜';
    if (nome === 'data') return '💾';
    if (nome === 'nginx') return '🌐';
    if (nome === 'auth') return '��';
    if (nome === 'api') return '🌐';
    if (nome === 'departments') return '🏢';
    if (nome === 'legal' || nome === 'juridico') return '⚖️';
    if (nome === 'financial' || nome === 'financeiro') return '💰';
    if (nome === 'operations' || nome === 'operacao') return '⚙️';
    if (nome === 'hr' || nome === 'recursoshumanos') return '👥';
    if (nome === 'maintenance' || nome === 'manutencao') return '🔧';
    if (nome === 'logistics' || nome === 'logistica') return '🚛';
    if (nome === 'fuel' || nome === 'combustivel') return '⛽';
    if (nome === 'personal' || nome === 'departamentopessoal') return '👤';
    if (nome === 'layout') return '🎨';
    if (nome === 'navigation') return '🧭';
    if (nome === 'ui') return '🎛️';
    if (nome === 'contexts') return '🔄';
    if (nome === 'routes') return '🛣️';
    if (nome === 'lib') return '📚';
    if (nome === 'types') return '🏷️';
    if (nome === 'config') return '⚙️';
    if (nome === 'database') return '🗄️';
    if (nome === 'migrations') return '🔄';
    if (nome === 'entities') return '��️';
    if (nome === 'dto') return '📋';
    if (nome === 'decorators') return '✨';
    if (nome === 'guards') return '🛡️';
    if (nome === 'strategies') return '🎯';
    if (nome === 'filters') return '��';
    if (nome === 'interceptors') return '🔗';
    if (nome === 'pipes') return '��';
    if (nome === 'common') return '��';
    if (nome === 'email') return '��';
    if (nome === 'health') return '🏥';
    if (nome === 'oracle') return '��';
    if (nome === 'users') return '��';
    if (nome === 'admin') return '👑';
    if (nome === 'errors') return '❌';
    if (nome === 'reports') return '📊';
    if (nome === 'tools') return '��️';
    if (nome === 'styles') return '��';
    if (nome === 'backend') return '🖥️';
    if (nome === 'frontend') return '💻';
    if (nome === 'apps') return '��';
    if (nome === 'packages') return '📦';
    if (nome === 'docker') return '🐳';
    if (nome === 'postgres') return '��';
    if (nome === 'init') return '��';
    if (nome === 'shared') return '🤝';
    if (nome === 'repositories') return '🗂️';
    
    return '📁';
  }
  
  const ext = path.extname(caminho).toLowerCase();
  const nome = path.basename(caminho).toLowerCase();
  
  // Arquivos específicos com ícones especiais
  if (nome === 'package.json') return '��';
  if (nome === 'dockerfile' || nome.startsWith('dockerfile.')) return '🐳';
  if (nome === 'docker-compose.yml' || nome.includes('docker-compose')) return '🐙';
  if (nome === 'readme.md') return '📖';
  if (nome === 'tsconfig.json') return '🔧';
  if (nome === 'vite.config.ts') return '⚡';
  if (nome === 'tailwind.config.js') return '🎨';
  if (nome === 'nginx.conf') return '🌐';
  if (nome === 'pnpm-workspace.yaml') return '⚙️';
  if (nome === '.env') return '🔐';
  if (nome === '.gitignore') return '🚫';
  if (nome === 'nest-cli.json') return '🪶';
  if (nome === 'typeorm.config.json') return '🗄️';
  if (nome === 'postcss.config.js') return '🎨';
  
  // Componentes específicos do Legal
  if (nome === 'legaldashboard.tsx') return '📊';
  if (nome === 'legalmetrics.tsx') return '��';
  if (nome === 'legalprocesses.tsx') return '⚖️';
  if (nome === 'legalcontracts.tsx') return '📄';
  if (nome === 'legalfines.tsx') return '🚨';
  if (nome === 'legalalerts.tsx') return '⚠️';
  if (nome === 'legalquickactions.tsx') return '⚡';
  
  // Hooks específicos
  if (nome.startsWith('uselegal')) return '🎣';
  if (nome.includes('dashboard') && nome.includes('hook')) return '📊';
  if (nome.includes('process') && nome.includes('hook')) return '⚖️';
  if (nome.includes('contract') && nome.includes('hook')) return '📄';
  if (nome.includes('fine') && nome.includes('hook')) return '🚨';
  
  // Services específicos
  if (nome === 'legalservice.ts') return '⚖️';
  if (nome === 'client.ts') return '🌐';
  if (nome === 'types.ts') return '🏷️';
  
  // Páginas específicas
  if (nome.includes('page.tsx')) return '📄';
  if (nome.includes('dashboard')) return '📊';
  if (nome.includes('legal')) return '⚖️';
  if (nome.includes('juridico')) return '⚖️';
  
  // Arquivos de teste e migração
  if (nome.includes('migration')) return '🔄';
  if (nome.includes('test')) return '🧪';
  if (nome.includes('spec')) return '🧪';
  
  // Por extensão
  switch (ext) {
    case '.ts': return '🔷';
    case '.tsx': return '⚛️';
    case '.js': return '🟨';
    case '.jsx': return '⚛️';
    case '.json': return '📋';
    case '.md': return '📝';
    case '.yml': case '.yaml': return '⚙️';
    case '.sql': return '🗃️';
    case '.sh': return '��';
    case '.env': return '��';
    case '.txt': return '📄';
    case '.pdf': return '📕';
    case '.png': case '.jpg': case '.jpeg': case '.gif': return '��️';
    case '.svg': return '🎨';
    case '.css': case '.scss': case '.sass': return '🎨';
    case '.html': return '��';
    case '.lock': return '🔒';
    case '.map': return '🗺️';
    case '.d.ts': return '🏷️';
    default: return '📄';
  }
}

function listar(diretorio, prefixo = '', nivel = 0, nivelMax = 6, filtro = null) {
  if (nivel > nivelMax || deveIgnorarCaminho(diretorio)) {
    return;
  }

  let itens;
  try {
    itens = fs.readdirSync(diretorio);
  } catch (err) {
    console.error(`❌ Erro ao ler o diretório ${diretorio}: ${err.message}`);
    return;
  }

  // Filtrar itens ignorados e aplicar filtro se especificado
  itens = itens.filter(item => {
    const caminho = path.join(diretorio, item);
    const ignorado = deveIgnorarCaminho(caminho);
    const correspondeAoFiltro = !filtro || item.toLowerCase().includes(filtro.toLowerCase());
    
    return !ignorado && correspondeAoFiltro;
  });

  // Ordenar itens: diretórios primeiro, depois arquivos
  itens.sort((a, b) => {
    const caminhoA = path.join(diretorio, a);
    const caminhoB = path.join(diretorio, b);
    
    try {
      const statsA = fs.statSync(caminhoA);
      const statsB = fs.statSync(caminhoB);
      
      if (statsA.isDirectory() && !statsB.isDirectory()) return -1;
      if (!statsA.isDirectory() && statsB.isDirectory()) return 1;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    } catch {
      return a.localeCompare(b);
    }
  });

  for (let i = 0; i < itens.length; i++) {
    const item = itens[i];
    const caminho = path.join(diretorio, item);
    const isLast = i === itens.length - 1;
    
    let stats;
    try {
      stats = fs.statSync(caminho);
    } catch (err) {
      console.error(`❌ Erro ao obter estatísticas para ${caminho}: ${err.message}`);
      continue;
    }

    // Usar diferentes símbolos para último item
    const connector = isLast ? '└── ' : '├── ';
    const nextPrefix = isLast ? '    ' : '│   ';
    
    // Adicionar emoji baseado no tipo de arquivo
    const icon = getFileIcon(caminho, stats);
    
    console.log(prefixo + connector + icon + ' ' + item);

    if (stats.isDirectory()) {
      listar(caminho, prefixo + nextPrefix, nivel + 1, nivelMax, filtro);
    }
  }
}

// Processar argumentos da linha de comando
const args = process.argv.slice(2);
let nivelMax = 6; // ✅ AUMENTADO PARA 6 NÍVEIS
let diretorio = '.';
let filtro = null;
let mostrarAjuda = false;

// Processar argumentos
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--help' || arg === '-h') {
    mostrarAjuda = true;
  } else if (arg === '--levels' || arg === '-l') {
    nivelMax = parseInt(args[i + 1]) || 6;
    i++; // Pular próximo argumento
  } else if (arg === '--dir' || arg === '-d') {
    diretorio = args[i + 1] || '.';
    i++; // Pular próximo argumento
  } else if (arg === '--filter' || arg === '-f') {
    filtro = args[i + 1];
    i++; // Pular próximo argumento
  } else if (arg === '--all' || arg === '-a') {
    // Mostrar tudo, incluindo arquivos normalmente ignorados
    ignorar.length = 0;
    arquivosIgnorar.length = 0;
  } else if (arg === '--components' || arg === '-c') {
    // Filtro especial para mostrar apenas componentes
    filtro = 'components';
  } else if (arg === '--legal' || arg === '-legal') {
    // Filtro especial para mostrar apenas arquivos relacionados ao legal
    filtro = 'legal';
  } else if (!isNaN(parseInt(arg)) && i === 0) {
    nivelMax = parseInt(arg);
  } else if (i === 1 && !args[i - 1].startsWith('-')) {
    diretorio = arg;
  }
}

if (mostrarAjuda) {
  console.log('🌳 Telemetria Project Structure Viewer');
  console.log('');
  console.log('📖 Uso:');
  console.log('  node listar-arquivos.js [níveis] [diretório] [opções]');
  console.log('');
  console.log('🔧 Opções:');
  console.log('  -l, --levels <n>     Número máximo de níveis (padrão: 6)');
  console.log('  -d, --dir <path>     Diretório inicial (padrão: .)');
  console.log('  -f, --filter <term>  Filtrar por nome');
  console.log('  -c, --components     Mostrar apenas componentes');
  console.log('  --legal              Mostrar apenas arquivos relacionados ao legal');
  console.log('  -a, --all           Mostrar todos os arquivos (incluindo ignorados)');
  console.log('  -h, --help          Mostrar esta ajuda');
  console.log('');
  console.log('💡 Exemplos:');
  console.log('  node listar-arquivos.js 7                    # 7 níveis');
  console.log('  node listar-arquivos.js 5 apps               # 5 níveis na pasta apps');
  console.log('  node listar-arquivos.js --levels 8           # 8 níveis');
  console.log('  node listar-arquivos.js --dir apps/frontend  # Apenas frontend');
  console.log('  node listar-arquivos.js --filter legal       # Filtrar por "legal"');
  console.log('  node listar-arquivos.js --components         # Apenas componentes');
  console.log('  node listar-arquivos.js --legal              # Apenas arquivos legais');
  console.log('  node listar-arquivos.js --all                # Mostrar tudo');
  console.log('  node listar-arquivos.js -d src -l 9 -f tsx   # Complexo');
  process.exit(0);
}

// Verificar se o diretório existe
if (!fs.existsSync(diretorio)) {
  console.error(`❌ Erro: Diretório '${diretorio}' não encontrado!`);
  process.exit(1);
}

console.log(`🌳 Estrutura do projeto (máximo ${nivelMax} níveis):`);
console.log(`📍 Diretório: ${path.resolve(diretorio)}`);
if (filtro) console.log(`🔍 Filtro: ${filtro}`);
console.log('');

const rootName = path.basename(path.resolve(diretorio));
const rootStats = fs.statSync(diretorio);
const rootIcon = getFileIcon(diretorio, rootStats);
console.log(rootIcon + ' ' + rootName);

listar(diretorio, '', 0, nivelMax, filtro);

console.log('');
console.log('�� Dicas de uso:');
console.log('  node listar-arquivos.js 7                    # 7 níveis');
console.log('  node listar-arquivos.js 5 apps               # 5 níveis na pasta apps');
console.log('  node listar-arquivos.js --levels 8           # 8 níveis');
console.log('  node listar-arquivos.js --dir apps/frontend  # Apenas frontend');
console.log('  node listar-arquivos.js --filter legal       # Filtrar por "legal"');
console.log('  node listar-arquivos.js --components         # Apenas componentes');
console.log('  node listar-arquivos.js --legal              # Apenas arquivos legais');
console.log('  node listar-arquivos.js --all                # Mostrar TUDO');
console.log('  node listar-arquivos.js --help               # Ajuda completa');