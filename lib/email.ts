// Ponto de integração: o envio real de e-mail depende de um provedor conectado.
// Configure RESEND_API_KEY e EMAIL_FROM (domínio verificado) para ativar a recuperação de senha.

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

export async function sendEmail(input: { to: string; subject: string; html: string }) {
  if (!isEmailConfigured()) {
    throw new Error('Provedor de e-mail não configurado (RESEND_API_KEY e EMAIL_FROM)')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  })

  if (!response.ok) {
    throw new Error(`Falha ao enviar e-mail (${response.status})`)
  }
}
