# copilotkit-AG-UI-trainning

Repository for CopilotKit & AG-UI training and experiments.

## Practices

- [Run all practices](practices/README.md)
- [AG-UI CLI](practices/ag-ui-cli/README.md)
- [AG-UI Custom Agent](practices/ag-ui-custom-agent/README.md)
- [AG-UI Server-Based Integration](practices/ag-ui-server/README.md)
- [Interactive Agent](practices/interactive-agent/README.md)
- [Middleware-Based Integration CLI](practices/middleware-based/README.md)
- [Todo Copilot](practices/todo/README.md)

# AG-UI CLI
cd practices/ag-ui-cli
npm ci
npm start

cd practices/ag-ui-custom-agent
pnpm install
pnpm dev

cd practices/ag-ui-server
pnpm install
pnpm dev
# Mở http://localhost:5173

# Interactive agent
cd practices/interactive-agent
npm ci
Copy-Item .env.example .env
npm run dev
# Mở http://localhost:3000

# Middleware-based CLI
cd practices/middleware-based
pnpm install
Copy-Item .env.example .env
pnpm dev


# Todo
cd practices/todo
npm ci
Copy-Item .env.example .env.local
npm run dev
# Mở http://localhost:3000