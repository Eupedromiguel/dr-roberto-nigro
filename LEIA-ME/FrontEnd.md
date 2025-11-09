# Clínica Dr. Roberto Nigro — Front-End com React + Vite

# Tecnologias Principais

| Categoria                   | Tecnologias                               |
|-----------------------------|-------------------------------------------|
| **Framework**               | React e DOM 19.1.1, Vite 7.1.10           |
| **UI / Estilo**             | Tailwind v4, Framer Motion, Lucide Icons  |
| **Gerenciamento de Estado** | React Context + Hooks personalizados      |
|-----------------------------|-------------------------------------------|

# Autenticação e Papéis

Cada usuário possui um **papel (role)** definido no Firebase Auth via *Custom Claims*:
- `patient` → agendar, ver e cancelar consultas.
- `doctor` → criar slots, confirmar, remarcar ou cancelar consultas.
- `admin` → acessar todos os dados e o painel administrativo.

Esses papéis são carregados no front via `AuthContext` e determinam o acesso às rotas.

---

# Regras de Rotas e Proteção de Acesso

O app usa **React Router DOM** e componentes de proteção para garantir que cada papel veja apenas o permitido.

# ProtectedRoute
Bloqueio de acesso a rotas privadas (Perfil/Marcar consulta/Minhas consultas) se o usuário não estiver autenticado.

# AdminRoute
Permite acesso apenas a administradores.

# DoctorRoute
Restringe acesso apenas a médicos.

# Design e Experiência
- Layout responsivo (mobile-first, Tailwind)
- Animações com Framer Motion
- Skeleton loaders e modais dinâmicos
- Ícones: Lucide Icons

# Boas Práticas Implementadas
- Rotas protegidas por papel e autenticação.  
- Layouts responsivos e reutilizáveis.    
- Comunicação segura com Cloud Functions.  
- Três camadas de segurança: *Firestore Rules + Claims + Rotas Protegidas*.