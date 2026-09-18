// Execute este script para criar o usuário admin
// No terminal: npx ts-node scripts/setup-admin.ts
// Ou simplesmente acesse a URL abaixo no navegador/Postman

const ADMIN_DATA = {
  email: "luiz.simba@eficazmarketing.com",
  password: "EficazAdmin@2024!",
  name: "Luiz Simba",
}

async function setupAdmin() {
  // Substitua pela URL do seu app
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  const response = await fetch(`${baseUrl}/api/setup-admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(ADMIN_DATA),
  })

  const result = await response.json()
  console.log("Result:", result)
}

setupAdmin()
