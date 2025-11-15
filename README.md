# 🎵 Spotfy - Player de Música Client-Side

**Spotfy** é uma aplicação web client-side inspirada no Spotify, que funciona completamente no navegador do usuário, sem necessidade de servidor backend ou banco de dados externo. Todas as músicas e dados são armazenados localmente no dispositivo do usuário.

## 📋 Características Principais

### ✨ Funcionalidades Implementadas

- **📤 Upload e Reprodução de Músicas**: Carregue arquivos de áudio (MP3, WAV, etc.) diretamente do seu dispositivo e reproduza em um player completo
- **📝 Playlists Personalizadas**: Crie, edite e gerencie playlists personalizadas (armazenadas em localStorage)
- **🔍 Busca Inteligente**: Busque músicas por nome, artista ou álbum na sua biblioteca local
- **📚 Biblioteca Pessoal**: Visualize todas as suas músicas, organize por favoritas e gerencie sua coleção
- **🎮 Player Completo**: Controles de reprodução (play/pause, próximo/anterior, volume, shuffle/repeat), barra de progresso e fila de reprodução
- **💡 Recomendações Simples**: Sistema de recomendações baseado em gêneros e histórico de reprodução

### 🏗️ Arquitetura Técnica

- **Tecnologias**: HTML5, CSS3, JavaScript puro (ES6+)
- **Armazenamento**:
  - **IndexedDB**: Para armazenar arquivos de áudio e metadados
  - **localStorage**: Para playlists e preferências do usuário
- **API de Áudio**: Web Audio API nativa do navegador
- **Sem Dependências Externas**: Aplicação 100% client-side, sem APIs externas

### 🎨 Design e UX

- **Tema**: Interface inspirada no Spotify com cores verde escuro (#1db954) e fundo escuro
- **Layout**: Sidebar de navegação, área de conteúdo principal e player fixo na parte inferior
- **Responsividade**: Funciona perfeitamente em dispositivos desktop e mobile
- **Acessibilidade**: Suporte básico para navegação por teclado

## 🚀 Como Usar

### Instalação Local

1. **Clone ou baixe este repositório**
   ```bash
   git clone <url-do-repositorio>
   cd spotfy
   ```

2. **Abra o arquivo `index.html` no seu navegador**
   - Simplesmente abra o arquivo HTML em qualquer navegador moderno (Chrome, Firefox, Edge, Safari)
   - Ou use um servidor local simples:
     ```bash
     # Python 3
     python -m http.server 8000
     
     # Node.js (http-server)
     npx http-server
     ```

3. **Acesse no navegador**
   - Se usar servidor local: `http://localhost:8000`
   - Se abrir diretamente: `file:///caminho/para/index.html`

### Deploy Estático

#### GitHub Pages

1. Faça push do código para um repositório GitHub
2. Vá em **Settings** > **Pages**
3. Selecione a branch `main` e pasta `root`
4. Acesse `https://seu-usuario.github.io/spotfy`

#### Netlify

1. Conecte seu repositório GitHub ao Netlify
2. Configure:
   - **Build command**: (deixe vazio)
   - **Publish directory**: `/` (raiz)
3. Deploy automático a cada push

## 📖 Guia de Uso

### Carregando Músicas

1. Clique no botão **"📁 Carregar Músicas"** no topo da página
2. Selecione um ou mais arquivos de áudio do seu dispositivo
3. As músicas serão processadas e adicionadas à sua biblioteca
4. **Dica**: Nomes de arquivo no formato `Artista - Nome da Música.mp3` são automaticamente parseados

### Criando Playlists

1. Clique no botão **"+"** na seção de Playlists na sidebar
2. Digite um nome para a playlist
3. Clique em **"Criar"**
4. Para adicionar músicas, clique no botão de ação (⋮) ao lado de uma música e selecione a playlist

### Reproduzindo Músicas

- **Clique em qualquer música** para começar a reprodução
- Use os controles do player na parte inferior:
  - **▶/⏸**: Play/Pause
  - **⏮/⏭**: Música anterior/próxima
  - **🔀**: Modo aleatório (shuffle)
  - **🔁**: Modo de repetição (off/all/one)
  - **🔊**: Controle de volume
  - **📋**: Visualizar fila de reprodução

### Buscando Músicas

1. Navegue para a seção **"Buscar"**
2. Digite o termo de busca (nome, artista ou álbum)
3. Pressione Enter ou clique no botão de busca
4. Os resultados aparecerão abaixo

### Favoritando Músicas

- Clique no ícone de coração (🤍) ao lado de qualquer música
- Músicas favoritas podem ser filtradas na seção **"Sua Biblioteca"**

## 🔧 Estrutura do Código

```
spotfy/
│
├── index.html          # Estrutura HTML principal
├── styles.css          # Estilos CSS (tema Spotify)
├── app.js              # Lógica JavaScript completa
└── README.md           # Esta documentação
```

### Complexidade Algorítmica

O sistema foi projetado com foco em simplicidade e eficiência:

- **Busca**: O(n) - Busca linear sobre a biblioteca de músicas
- **Recomendações**: O(n) - Análise linear do histórico e biblioteca
- **Playlists**: O(1) para criação, O(n) para busca/remoção
- **Armazenamento**: O(1) para operações de IndexedDB

Onde `n` é o número de músicas na biblioteca. Para bibliotecas pessoais (até algumas centenas de músicas), o desempenho é excelente.

## 🔒 Privacidade e Segurança

- **100% Local**: Todos os dados ficam no seu navegador
- **Sem Tracking**: Nenhum dado é enviado para servidores externos
- **Sem Cookies**: Apenas localStorage e IndexedDB locais
- **Limpeza**: Dados são apagados ao limpar dados do navegador

### Limpeza de Dados

Para remover todos os dados do Spotfy:

1. **Chrome/Edge**: Configurações > Privacidade > Limpar dados de navegação > IndexedDB e localStorage
2. **Firefox**: Configurações > Privacidade > Limpar dados > Dados de sites
3. **Safari**: Desenvolvedor > Limpar caches

## ⚠️ Limitações Conhecidas

### Limitações Técnicas

1. **Sem Streaming**: Não é possível reproduzir músicas de serviços externos
2. **Sem Sincronização**: Dados não sincronizam entre dispositivos
3. **Sem Contas**: Não há sistema de usuários ou autenticação
4. **Armazenamento Limitado**: Depende do espaço disponível no navegador (geralmente 5-10% do disco)
5. **Metadados Básicos**: Extração de metadados limitada (nome do arquivo)

### Melhorias Futuras Sugeridas

- **Extração de Metadados**: Integração com APIs para obter capas de álbum e metadados completos
- **Importação de Playlists**: Importar playlists do Spotify/YouTube Music via APIs
- **Compartilhamento Local**: WebRTC para compartilhar músicas entre dispositivos na mesma rede
- **Suporte a Podcasts**: Adicionar suporte para arquivos de podcast
- **Equalizador**: Adicionar equalizador de áudio básico
- **Temas**: Múltiplos temas (claro, escuro, personalizado)

## 🐛 Solução de Problemas

### Músicas não carregam

- Verifique se o arquivo é um formato de áudio suportado (MP3, WAV, OGG, etc.)
- Verifique o console do navegador (F12) para erros
- Tente arquivos menores primeiro para testar

### Player não reproduz

- Verifique se o navegador suporta Web Audio API
- Tente atualizar o navegador para a versão mais recente
- Verifique se há bloqueadores de autoplay ativos

### Dados perdidos

- Dados são armazenados localmente; limpar cache do navegador remove tudo
- Faça backup exportando playlists (funcionalidade futura)

### Performance lenta

- Reduza o número de músicas na biblioteca
- Use arquivos de áudio menores (comprimir MP3s)
- Feche outras abas do navegador

## 📝 Licença

Este projeto é fornecido como está, para fins educacionais e de demonstração.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

- Reportar bugs
- Sugerir novas funcionalidades
- Enviar pull requests
- Melhorar a documentação

## 📧 Suporte

Para questões, problemas ou sugestões, abra uma issue no repositório do projeto.

---

**Desenvolvido com ❤️ para demonstrar o poder das aplicações web client-side**

*Spotfy - Sua Música, Seu Controle, 100% Local*
