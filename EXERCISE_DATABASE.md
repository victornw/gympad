# 🏋️‍♂️ Banco de Dados de Exercícios - GymPad

## 📋 Visão Geral

O GymPad agora conta com um banco de dados completo de exercícios integrado com a API **wger.de**, oferecendo:

- **Nome dos exercícios**
- **Músculos trabalhados** (primários e secundários)
- **Imagens demonstrativas**
- **Descrições detalhadas**
- **Equipamentos necessários**
- **Categorização por grupos musculares**

## 🌐 API wger.de

A API do wger.de (https://wger.de/api/v2/) é uma fonte confiável e gratuita de dados de exercícios que inclui:

- **659+ exercícios** catalogados
- **Imagens de alta qualidade**
- **Múltiplos idiomas** (português incluído)
- **Categorização profissional**
- **Dados de equipamentos**

## 🚀 Funcionalidades

### 🔍 Busca Inteligente

- Busca por nome do exercício
- Busca por músculo trabalhado
- Busca por categoria
- Busca por equipamento

### 🎯 Filtragem por Categoria

- **Abs** - Exercícios abdominais
- **Arms** - Exercícios para braços
- **Back** - Exercícios para costas
- **Calves** - Exercícios para panturrilhas
- **Cardio** - Exercícios cardiovasculares
- **Chest** - Exercícios para peito
- **Legs** - Exercícios para pernas
- **Shoulders** - Exercícios para ombros

### 📱 Interface Moderna

- Design consistente com o app
- Cards informativos para cada exercício
- Modal detalhado com todas as informações
- Imagens em galeria horizontal
- Sistema de refresh para atualizações

### 💾 Sistema de Cache

- **Cache inteligente** - dados salvos localmente por 7 dias
- **Carregamento rápido** após primeira sincronização
- **Funciona offline** após cache inicial
- **Atualização automática** quando cache expira

## 🔧 Implementação Técnica

### Serviço de Exercícios (`exerciseService.ts`)

```typescript
// Principais métodos disponíveis:
-initialize() - // Inicializa e carrega dados
  getAllExercises() - // Retorna todos exercícios
  getExercisesByCategory() - // Filtra por categoria
  getExercisesByMuscle() - // Filtra por músculo
  searchExercises() - // Busca por termo
  clearCache(); // Limpa cache local
```

### Tela de Banco de Dados (`ExerciseDatabaseScreen.tsx`)

- Lista completa de exercícios
- Busca em tempo real
- Filtros por categoria
- Modal com detalhes completos
- Pull-to-refresh para atualizações

## 📊 Estrutura de Dados

### ExerciseInfo

```typescript
{
  id: number;
  name: string;
  category: string;
  muscles: string[];              // Músculos primários
  muscles_secondary: string[];    // Músculos secundários
  equipment: string[];            // Equipamentos necessários
  images: ExerciseImage[];        // Imagens demonstrativas
  videos: ExerciseVideo[];        // Vídeos (quando disponível)
  description: string;            // Descrição detalhada
}
```

## 🎨 Design System

### Cores Utilizadas

- **Primary Orange**: `#FF6F00` - Elementos principais
- **Accent Color**: `#FFAB00` - Destaques e categorias
- **Dark Charcoal**: `#1A1A1A` - Fundo principal
- **Medium Gray**: `#333333` - Cards e containers
- **Text Primary**: `#FFFFFF` - Texto principal
- **Text Secondary**: `#B0BEC5` - Texto secundário

## 🔄 Fluxo de Uso

1. **Primeira vez**: App baixa todos os dados da API (pode demorar alguns segundos)
2. **Uso regular**: Dados carregados instantaneamente do cache
3. **Busca**: Digite qualquer termo para filtrar exercícios
4. **Categorias**: Toque nos filtros para ver exercícios específicos
5. **Detalhes**: Toque em qualquer exercício para ver informações completas
6. **Atualização**: Puxe para baixo para forçar atualização dos dados

## 📈 Performance

- **Cache local** - AsyncStorage para persistência
- **Lazy loading** - Imagens carregadas sob demanda
- **Throttling** - Controle de requisições à API
- **Error handling** - Tratamento robusto de erros
- **Offline support** - Funciona sem internet após primeira carga

## 🔒 Privacidade

- **Sem autenticação necessária** - API pública
- **Dados locais apenas** - Cache armazenado no dispositivo
- **Sem tracking** - Nenhum dado enviado para terceiros
- **Open source** - API e dados são abertos

## 🚧 Próximas Melhorias

- [ ] Favoritos de exercícios
- [ ] Histórico de exercícios realizados
- [ ] Integração com treinos
- [ ] Vídeos demonstrativos
- [ ] Notas pessoais nos exercícios
- [ ] Sincronização com outros apps

---

## 📱 Como Usar

1. Abra o app GymPad
2. Toque na aba **"Exercícios"**
3. Aguarde o carregamento inicial (apenas primeira vez)
4. Use a barra de busca ou filtros de categoria
5. Toque em qualquer exercício para ver detalhes
6. Navegue pelas imagens deslizando horizontalmente

**Dica**: Puxe para baixo na lista para atualizar o banco de dados!
