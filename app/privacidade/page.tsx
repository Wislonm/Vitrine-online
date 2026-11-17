import type { Metadata } from 'next'
import { LegalDocument } from '@/components/legal/legal-document'

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Rascunho da Política de Privacidade da plataforma Minha Vitrine, com informações sobre tratamento de dados pessoais.',
}

const sections = [
  {
    title: '1. Controlador e escopo deste documento',
    paragraphs: [
      'A Minha Vitrine é a marca da plataforma de vitrines digitais e gestão de pedidos. A razão social ou nome civil do controlador, seu CNPJ ou CPF, endereço e canal oficial para solicitações de privacidade ainda precisam ser informados. Por isso, este texto é um rascunho incompleto e não deve ser tratado como a versão final da política.',
      'Esta política descreve, em linhas gerais, dados tratados ao criar e administrar uma conta na Minha Vitrine, usar uma vitrine pública e enviar pedidos pelo fluxo de WhatsApp. Ela deve ser revisada para refletir a identidade legal do controlador, os fornecedores contratados e os prazos efetivos de retenção antes da publicação definitiva.',
    ],
  },
  {
    title: '2. Papéis da Minha Vitrine e das lojas',
    paragraphs: [
      'A Minha Vitrine trata dados de cadastro, autenticação, segurança e administração da plataforma para prestar o serviço. Quando uma loja usa a plataforma para publicar produtos e receber pedidos, o lojista define a finalidade comercial e os dados solicitados de seus clientes; em relação a esse uso, o lojista pode ser o controlador e a Minha Vitrine pode atuar como operadora, conforme as circunstâncias e instruções aplicáveis.',
      'O lojista é responsável por fornecer aos visitantes informações adequadas sobre seu próprio tratamento de dados e por atender solicitações relacionadas ao pedido e à relação de consumo. Esta política da Minha Vitrine não substitui a política de privacidade de cada loja.',
    ],
  },
  {
    title: '3. Dados pessoais tratados',
    paragraphs: ['Dependendo do uso da plataforma, podemos tratar as seguintes categorias:'],
    bullets: [
      'Cadastro do lojista: nome, e-mail, nome comercial, CPF ou CNPJ e WhatsApp informado para receber pedidos.',
      'Dados da loja e da vitrine: endereço, cidade, estado, telefone, e-mail de contato, links de redes sociais, nome exibido, descrição, slug, imagens, produtos, preços, categorias, estoque e variações.',
      'Dados informados por clientes ao enviar um pedido: nome, telefone opcional, observações, itens, quantidades, variações e valores do pedido.',
      'Dados da assinatura e pagamento: plano, valor e período, opção de cobrança recorrente, método (cartão ou Pix), estado da transação, identificadores do Mercado Pago, referência de conciliação e, enquanto o Pix estiver pendente, código QR/copia e cola e validade.',
      'Dados técnicos e de segurança: endereço IP e agente do navegador associados à sessão, registros de autenticação e eventos necessários para proteger e manter o serviço.',
      'Métricas de navegação: a versão de produção usa Vercel Analytics para métricas de uso do site.',
    ],
  },
  {
    title: '4. Finalidades e bases legais',
    paragraphs: ['Os dados podem ser usados para:'],
    bullets: [
      'Criar e administrar contas, autenticar usuários e disponibilizar o painel e a vitrine, com base na execução de contrato ou em procedimentos preliminares solicitados pelo titular.',
      'Exibir publicamente dados e conteúdos que o lojista escolhe publicar, para operar a vitrine e viabilizar pedidos.',
      'Criar e administrar a assinatura e as cobranças recorrentes autorizadas pelo usuário, com base na execução do contrato e na autorização expressa dada no checkout.',
      'Registrar e encaminhar pedidos, proteger contas, prevenir fraude e abuso, manter a segurança e solucionar falhas, conforme a execução do serviço e, quando aplicável, o legítimo interesse.',
      'Cumprir obrigações legais e regulatórias e exercer direitos em processos administrativos ou judiciais, quando aplicável.',
      'Registrar a versão e a data do aceite dos Termos de Uso feito no cadastro, para comprovar a manifestação do usuário. O aceite dos termos não substitui a definição de uma base legal adequada para cada finalidade de tratamento.',
    ],
  },
  {
    title: '5. Compartilhamento e fornecedores',
    paragraphs: [
      'Não vendemos dados pessoais. O acesso pode ser compartilhado na medida necessária para operar a plataforma com fornecedores de hospedagem e infraestrutura (Vercel), banco de dados (Neon), armazenamento de imagens (Vercel Blob), processamento de pagamentos e assinaturas (Mercado Pago) e, quando configurado, envio de e-mails transacionais e de recuperação de senha (Resend). Os fornecedores tratam dados conforme seus serviços e termos aplicáveis.',
      'No checkout transparente, o SDK do Mercado Pago captura os dados completos do cartão em campos seguros e gera um token. A Minha Vitrine encaminha esse token e os dados necessários à assinatura ao Mercado Pago, mas não recebe nem armazena o número completo do cartão ou o código de segurança (CVV). O Mercado Pago pode tratar dados do pagador e da assinatura conforme sua própria política.',
      'Quando o cliente escolhe enviar um pedido pelo WhatsApp, o navegador abre o serviço da Meta/WhatsApp com a mensagem preparada. O cliente precisa confirmar o envio; a partir daí, o tratamento também fica sujeito aos termos e à política do WhatsApp e do lojista destinatário.',
      'Dados também poderão ser compartilhados quando necessário para cumprir a lei, atender uma ordem válida, proteger direitos e segurança ou viabilizar uma reorganização da plataforma, observadas as salvaguardas aplicáveis.',
    ],
  },
  {
    title: '6. Armazenamento e transferências internacionais',
    paragraphs: [
      'Os dados são armazenados nos serviços de infraestrutura utilizados pela plataforma. A localização e os fluxos internacionais dependem da configuração e das regiões dos fornecedores contratados; esses detalhes e as salvaguardas aplicáveis precisam ser confirmados antes da versão final desta política. Quando houver transferência internacional, ela deverá observar a LGPD e a regulamentação da ANPD.',
    ],
  },
  {
    title: '7. Cookies, sessão e métricas',
    paragraphs: [
      'Cookies e identificadores de sessão são usados para autenticação, segurança e funcionamento das áreas da conta. A versão de produção também carrega Vercel Analytics para métricas de navegação. A configuração detalhada de cookies e métricas deve ser revista antes da publicação final. No momento, não declaramos uso de publicidade comportamental ou venda de dados.',
    ],
  },
  {
    title: '8. Retenção e exclusão',
    paragraphs: [
      'Mantemos dados pelo tempo necessário para prestar o serviço, manter a segurança, cumprir obrigações legais e exercer direitos. Quando a conta é encerrada, os dados poderão ser eliminados, anonimizados ou retidos pelo prazo necessário em razão de obrigações legais, prevenção a fraude, solução de disputas e cópias de segurança. Os prazos específicos por categoria ainda precisam ser definidos e documentados.',
      'Dados de pedidos podem estar relacionados às atividades do lojista e às obrigações legais dele. O lojista deve ser contatado para solicitações relativas à compra e à relação comercial; a Minha Vitrine deve ser contatada para dados da conta e da plataforma.',
    ],
  },
  {
    title: '9. Direitos dos titulares',
    paragraphs: [
      'Nos termos da LGPD, o titular pode solicitar confirmação do tratamento, acesso, correção, anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade, portabilidade quando aplicável, informação sobre compartilhamentos e revisão de decisões automatizadas nos casos previstos em lei. Também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).',
      'O canal oficial da Minha Vitrine para receber essas solicitações ainda não foi definido. Esse contato precisa ser publicado antes de esta política ser considerada final. Para dados tratados diretamente por uma loja, procure o lojista responsável.',
    ],
  },
  {
    title: '10. Segurança e incidentes',
    paragraphs: [
      'Adotamos medidas técnicas e organizacionais compatíveis com a natureza do serviço para proteger contas, sessões, imagens e informações contra acesso ou uso indevido. Nenhum sistema é totalmente livre de riscos. Incidentes com risco ou dano relevante serão tratados e comunicados conforme a LGPD e as regras aplicáveis da ANPD.',
    ],
  },
  {
    title: '11. Alterações e contato',
    paragraphs: [
      'Esta política pode ser atualizada para refletir mudanças no serviço, nos fornecedores ou na legislação. A versão e a data serão atualizadas quando houver alteração material. O nome legal e o canal de contato do controlador estão pendentes; esta informação deve ser completada antes da publicação final.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Política de Privacidade"
      description="Entenda quais dados a Minha Vitrine trata, para quais finalidades e como exercer seus direitos previstos na Lei Geral de Proteção de Dados (LGPD)."
      sections={sections}
      relatedHref="/termos"
      relatedLabel="Ler os Termos de Uso"
    />
  )
}
