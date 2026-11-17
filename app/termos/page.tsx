import type { Metadata } from 'next'
import { LegalDocument } from '@/components/legal/legal-document'

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Rascunho dos Termos de Uso da plataforma Ui Sales.',
}

const sections = [
  {
    title: '1. Identificação e versão do documento',
    paragraphs: [
      'A Ui Sales é a marca de uma plataforma digital de vitrines e organização de pedidos. A razão social ou nome civil do fornecedor, CNPJ ou CPF, endereço e canal oficial de contato ainda não foram informados. Este documento é um rascunho incompleto e não deve ser tratado como a versão final dos termos.',
      'Ao criar uma conta, o usuário confirma que leu e aceita estes Termos de Uso e que leu a Política de Privacidade. O registro do aceite guarda a data e a versão aceita.',
    ],
  },
  {
    title: '2. O serviço',
    paragraphs: [
      'A Ui Sales oferece ferramentas para criar uma vitrine digital, cadastrar produtos, organizar categorias e variações, apresentar informações da loja e encaminhar pedidos pelo WhatsApp. O serviço não é uma loja vendedora, marketplace ou intermediador da compra e venda entre o lojista e seus clientes.',
      'Os recursos podem ser atualizados, modificados ou descontinuados para manutenção, segurança ou evolução do serviço, observadas as normas aplicáveis e a comunicação razoável aos usuários quando necessária.',
    ],
  },
  {
    title: '3. Cadastro e segurança da conta',
    paragraphs: [
      'O cadastro deve ser realizado por pessoa autorizada a representar a loja e as informações fornecidas devem ser verdadeiras, completas e atualizadas. O usuário é responsável por proteger suas credenciais, limitar o acesso à conta e avisar a plataforma sobre uso não autorizado.',
      'Uma pessoa não deve criar contas em nome de terceiros sem autorização. A Ui Sales pode solicitar informações necessárias para validar cadastro, proteger o serviço ou cumprir a lei.',
    ],
  },
  {
    title: '4. Teste grátis, plano e cobrança',
    paragraphs: [
      'Cada nova conta recebe um período de teste grátis de 30 dias, com acesso aos recursos do painel e ao plano único atualmente oferecido. O período começa com a criação da loja vinculada à conta.',
      'Ao fim dos 30 dias, o acesso ao painel fica bloqueado até a contratação do plano único. O checkout transparente é processado pelo Mercado Pago e mostra o valor e o período antes da confirmação. O usuário escolhe entre pagamento único por cartão ou Pix, sem renovação automática, ou cobrança recorrente por cartão. A recorrência é opcional e vem desativada por padrão; não há cobrança durante o teste grátis. Pix é sempre um pagamento único nesta integração.',
      'Os dados do cartão são capturados e tokenizados pelo SDK seguro do Mercado Pago. A Ui Sales não recebe nem armazena o número completo do cartão ou o código de segurança; recebe o token necessário para criar a assinatura e o estado retornado pelo provedor.',
      'O usuário pode cancelar a renovação pelo painel. Quando o Mercado Pago informar uma data de encerramento do período já pago, o acesso permanece até essa data; caso contrário, o cancelamento pode encerrar o acesso imediatamente.',
      'Enquanto a conta estiver sem acesso ao painel, a vitrine pública pode continuar disponível se não tiver sido desativada ou suspensa por outro motivo. A plataforma poderá limitar essa disponibilidade em situações de segurança, descumprimento destes termos ou exigência legal.',
    ],
  },
  {
    title: '5. Responsabilidades do lojista',
    paragraphs: ['O lojista é responsável por sua atividade comercial, pela loja publicada e por cumprir a legislação aplicável, inclusive as regras de proteção ao consumidor e de proteção de dados. Isso inclui:'],
    bullets: [
      'Manter corretos preços, ofertas, estoque, descrições, contatos, prazos, condições de entrega e demais informações da vitrine.',
      'Ter direitos ou autorização para usar marcas, imagens, textos e outros materiais enviados à plataforma.',
      'Cumprir obrigações fiscais, comerciais, consumeristas e de propriedade intelectual relacionadas às vendas.',
      'Informar seus clientes sobre o tratamento de dados pessoais feito pela própria loja e atender solicitações relativas a pedidos e à relação comercial.',
    ],
  },
  {
    title: '6. Pedidos e WhatsApp',
    paragraphs: [
      'O fluxo da plataforma organiza os itens escolhidos e prepara uma mensagem para o WhatsApp do lojista. O pedido só é transmitido quando o cliente confirma o envio no WhatsApp. O cliente e o lojista devem conferir os dados, disponibilidade, preço, pagamento, entrega e demais condições antes de concluir a compra.',
      'A Ui Sales não recebe pagamentos, não define as condições comerciais do lojista e não garante a conclusão ou o cumprimento de uma venda. A relação de compra e venda ocorre diretamente entre o lojista e o cliente. O uso do WhatsApp também está sujeito aos termos e à política da Meta/WhatsApp.',
    ],
  },
  {
    title: '7. Conteúdo e licença limitada',
    paragraphs: [
      'O usuário mantém seus direitos sobre o conteúdo que envia. Para operar a vitrine, o usuário autoriza a Ui Sales, de forma não exclusiva e limitada ao funcionamento do serviço, a armazenar, processar, reproduzir tecnicamente e exibir esse conteúdo na plataforma e nos canais escolhidos pelo próprio usuário. Essa autorização termina quando o conteúdo é removido ou a conta é encerrada, ressalvadas cópias de segurança e retenções legais.',
      'O usuário declara que o conteúdo não viola direitos de terceiros, não é ilegal e não contém material que a plataforma esteja proibida de hospedar.',
    ],
  },
  {
    title: '8. Uso proibido e medidas de segurança',
    paragraphs: ['Não é permitido usar a plataforma para:'],
    bullets: [
      'Fraude, golpe, atividade ilegal, violação de direitos de terceiros ou descumprimento de normas de consumo.',
      'Publicar produtos ou serviços proibidos por lei, conteúdo enganoso ou material sem autorização.',
      'Tentar acessar contas, sistemas ou dados sem autorização, interferir na segurança ou prejudicar a disponibilidade do serviço.',
      'Coletar dados de visitantes ou clientes além do necessário ou usar informações de forma incompatível com a lei e com a finalidade informada.',
    ],
  },
  {
    title: '9. Suspensão, bloqueio e encerramento',
    paragraphs: [
      'O painel pode ser suspenso ao fim do período de teste enquanto a contratação do plano não estiver disponível. Separadamente, a Ui Sales pode suspender ou bloquear uma conta ou vitrine diante de indícios de fraude, risco à segurança, descumprimento destes termos, violação de direitos ou obrigação legal. Sempre que possível e permitido, o usuário será informado do motivo e dos meios de regularização ou contestação.',
      'O usuário poderá solicitar o encerramento da conta pelo canal oficial de atendimento, que ainda precisa ser definido. O encerramento poderá resultar na remoção da vitrine e dos dados, respeitados os prazos e deveres legais de retenção.',
    ],
  },
  {
    title: '10. Disponibilidade e limitações',
    paragraphs: [
      'A Ui Sales busca manter o serviço disponível e seguro, mas podem ocorrer interrupções por manutenção, falhas técnicas, indisponibilidade de fornecedores ou eventos fora de controle razoável. A plataforma não garante resultado comercial, volume de vendas ou disponibilidade contínua do WhatsApp ou de outros serviços de terceiros.',
      'Nada nestes termos exclui direitos ou responsabilidades que não possam ser afastados pela legislação brasileira. Eventuais limitações devem ser interpretadas conforme a legislação aplicável.',
    ],
  },
  {
    title: '11. Privacidade',
    paragraphs: [
      'O tratamento de dados pessoais relacionado à conta e ao serviço é descrito na Política de Privacidade. O lojista também deve manter sua própria comunicação de privacidade para os clientes da loja.',
    ],
  },
  {
    title: '12. Alterações, lei aplicável e contato',
    paragraphs: [
      'Estes termos podem ser atualizados para refletir mudanças no serviço ou na legislação. Alterações materiais serão comunicadas de forma apropriada, e um novo aceite será solicitado quando necessário.',
      'Aplicam-se as leis da República Federativa do Brasil. A identificação legal do fornecedor, o endereço e o canal oficial para dúvidas, notificações e solicitações ainda estão pendentes e devem ser incluídos antes da versão final.',
    ],
  },
]

export default function TermsPage() {
  return (
    <LegalDocument
      title="Termos de Uso"
      description="Conheça as regras para usar a Ui Sales, criar sua vitrine e organizar pedidos pelo WhatsApp."
      sections={sections}
      relatedHref="/privacidade"
      relatedLabel="Ler a Política de Privacidade"
    />
  )
}
