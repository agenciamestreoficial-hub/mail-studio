export type BlockDefinition = {
  id: string;
  label: string;
  icon: string;
  category: 'Conteúdo' | 'Layouts';
  content: string;
};
export const imageUrl = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85';
const text = '<mj-text font-size="16px" color="#55536b" line-height="1.7" padding="12px 28px">Escreva algo que vale a pena abrir. Dê dois cliques para editar este texto.</mj-text>';
const title = '<mj-text font-size="30px" font-weight="700" color="#232138" padding="20px 28px 8px">Uma boa ideia começa aqui.</mj-text>';
const button = '<mj-button background-color="#7060df" color="#ffffff" font-weight="600" border-radius="8px" inner-padding="15px 28px" href="https://example.com" padding="16px 28px">Saiba mais →</mj-button>';
const img = `<mj-image src="${imageUrl}" alt="Montanhas ao amanhecer" padding="12px 28px" border-radius="8px" />`;
export const section = (content: string, attrs = '') => `<mj-section padding="8px 0" background-color="#ffffff" ${attrs}><mj-column>${content}</mj-column></mj-section>`;
const columns = (a: string, b: string) => `<mj-section padding="16px 12px" background-color="#ffffff"><mj-column width="50%">${a}</mj-column><mj-column width="50%">${b}</mj-column></mj-section>`;
export const blockDefinitions: BlockDefinition[] = [
  { id: 'heading', label: 'Título', icon: 'heading', category: 'Conteúdo', content: section(title) },
  { id: 'text', label: 'Texto', icon: 'text', category: 'Conteúdo', content: section(text) },
  { id: 'image', label: 'Imagem', icon: 'image', category: 'Conteúdo', content: section(img) },
  { id: 'button', label: 'Botão', icon: 'button', category: 'Conteúdo', content: section(button) },
  { id: 'divider', label: 'Divisor', icon: 'divider', category: 'Conteúdo', content: section('<mj-divider border-color="#e8e7ef" border-width="1px" padding="16px 28px" />') },
  { id: 'spacer', label: 'Espaçador', icon: 'spacer', category: 'Conteúdo', content: section('<mj-spacer height="32px" />') },
  { id: 'social', label: 'Redes sociais', icon: 'social', category: 'Conteúdo', content: section('<mj-text align="center" color="#7060df" padding="20px 28px"><a href="https://instagram.com" style="color:#7060df;text-decoration:none">Instagram</a> &nbsp; · &nbsp; <a href="https://linkedin.com" style="color:#7060df;text-decoration:none">LinkedIn</a> &nbsp; · &nbsp; <a href="https://example.com" style="color:#7060df;text-decoration:none">Site</a></mj-text>') },
  { id: 'html', label: 'HTML', icon: 'code', category: 'Conteúdo', content: section('<mj-text padding="20px 28px"><div style="padding:24px;background:#f1effc;border-radius:8px;color:#51459c"><strong>Seu HTML, suas possibilidades.</strong><p>Selecione este bloco e clique em Editar HTML.</p></div></mj-text>') },
  { id: 'two-texts', label: '2 colunas', icon: 'columns', category: 'Layouts', content: columns(text, text) },
  { id: 'image-text', label: 'Imagem + texto', icon: 'image-text', category: 'Layouts', content: columns(img, title + text + button) },
  { id: 'two-images', label: '2 imagens', icon: 'images', category: 'Layouts', content: columns(img, img) },
  { id: 'card', label: 'Card completo', icon: 'card', category: 'Layouts', content: section(img + title + text + button) },
  { id: 'two-buttons', label: '2 botões', icon: 'buttons', category: 'Layouts', content: columns(button, button) },
  { id: 'footer', label: 'Rodapé', icon: 'footer', category: 'Layouts', content: section('<mj-text align="center" color="#8c899c" font-size="12px" line-height="1.8" padding="20px 28px">Enviado com carinho por Sua Marca.<br/>[COMPANY_FULL_ADDRESS]<br/><a href="[UNSUBSCRIBE_URL]" style="color:#8c899c">Cancelar inscrição</a> · <a href="[WEB_VERSION_URL]" style="color:#8c899c">Ver no navegador</a></mj-text>') },
];
export function wrapMjml(body: string, background = '#f0eef5') {
  return `<mjml><mj-head><mj-attributes><mj-all font-family="Arial, Helvetica, sans-serif" /><mj-text line-height="1.6" /></mj-attributes></mj-head><mj-body width="600px" background-color="${background}">${body}</mj-body></mjml>`;
}

// Expand shorthand before GrapesJS adds defaults. This keeps the design canvas
// and compiled email in agreement, including explicit zero padding.
export function normalizeTemplate(source: string): string {
  return source.replace(/<(mj-[\w-]+)([^>]*?)\/>/g, '<$1$2></$1>').replace(/\spadding="([^"]+)"/g, (_match, value: string) => {
    const [top, right = top, bottom = top, left = right] = value.split(/\s+/);
    return ` padding-top="${top}" padding-right="${right}" padding-bottom="${bottom}" padding-left="${left}"`;
  }).replace(/<mj-text\b([^>]*)>/g, (_match, attrs: string) => `<mj-text${attrs}${attrs.includes('line-height=') ? '' : ' line-height="1.6"'}${attrs.includes('font-family=') ? '' : ' font-family="Arial, Helvetica, sans-serif"'}>`);
}
const welcome = wrapMjml(`
<mj-section padding="30px 0 22px" background-color="#ffffff"><mj-column><mj-text align="center" font-size="25px" letter-spacing="-1px" font-weight="700" color="#2e2943" padding="0">aurora<span style="color:#8370e3">.</span></mj-text></mj-column></mj-section>
<mj-section padding="30px 24px 32px" background-color="#eeebfa"><mj-column>
<mj-text align="center" color="#7867bc" font-size="10px" letter-spacing="3px" font-weight="700" padding="4px 0 16px">UM NOVO COMEÇO</mj-text>
<mj-text align="center" color="#302947" font-size="38px" line-height="1.15" font-weight="700" letter-spacing="-1.5px" padding="0 14px 14px">Boas ideias merecem<br/>chegar mais longe.</mj-text>
<mj-text align="center" font-size="15px" color="#777088" line-height="1.7" padding="0 30px 16px">Olá, [FNAME]. Que bom ter você por aqui.<br/>O próximo capítulo da sua jornada começa agora.</mj-text>
<mj-button href="https://example.com" background-color="#7060cf" border-radius="7px" font-size="13px" font-weight="700" inner-padding="15px 26px" padding="4px 0">Explore as novidades &nbsp; →</mj-button>
</mj-column></mj-section>
<mj-section padding="0" background-color="#ffffff"><mj-column><mj-image src="${imageUrl}" alt="Pico de montanha cercado por nuvens" padding="0" /></mj-column></mj-section>
<mj-section padding="22px 20px 10px" background-color="#ffffff"><mj-column><mj-text font-size="23px" color="#302947" font-weight="700" padding="12px">Toda grande jornada começa com um passo.</mj-text><mj-text color="#777088" font-size="15px" line-height="1.8" padding="0 12px 16px">Inspiração, descobertas e possibilidades. Selecionamos o que importa para acompanhar você no caminho.</mj-text></mj-column></mj-section>
<mj-section padding="0 20px 20px" background-color="#ffffff"><mj-column width="50%"><mj-text font-size="16px" color="#51478a" font-weight="700" padding="12px">01. Descubra</mj-text><mj-text color="#777088" font-size="14px" padding="0 12px 12px">Conteúdos pensados para abrir novos horizontes.</mj-text></mj-column><mj-column width="50%"><mj-text font-size="16px" color="#51478a" font-weight="700" padding="12px">02. Transforme</mj-text><mj-text color="#777088" font-size="14px" padding="0 12px 12px">Pequenas ideias que fazem a diferença no seu dia.</mj-text></mj-column></mj-section>
${blockDefinitions.find(b => b.id === 'footer')!.content}
`);
export const templates = [
  { id: 'welcome', name: 'Um novo começo', category: 'Boas-vindas', color: '#eeebfa', subject: 'Que bom ter você por aqui ✨', preheader: 'O próximo capítulo da sua jornada começa agora.', mjml: welcome },
  { id: 'newsletter', name: 'Ideias da semana', category: 'Newsletter', color: '#e9f3ec', subject: 'Uma dose de inspiração para sua semana', preheader: 'Novidades, aprendizados e uma boa leitura.', mjml: wrapMjml(section('<mj-text font-size="14px" font-weight="700" color="#388262" letter-spacing="2px">SUA MARCA · NEWSLETTER</mj-text>') + section('<mj-text font-size="38px" font-weight="700" color="#1e4938">Ideias para uma<br/>semana extraordinária.</mj-text>' + text) + columns(img + text, img + text) + section(button) + blockDefinitions.at(-1)!.content, '#edf3ee') },
  { id: 'promotion', name: 'Algo especial chegou', category: 'Oferta', color: '#fff0e1', subject: 'Tem uma novidade esperando por você', preheader: 'Conheça a nossa seleção especial.', mjml: wrapMjml(section('<mj-text align="center" font-size="13px" letter-spacing="2px" color="#a15c32">SELEÇÃO ESPECIAL</mj-text><mj-text align="center" font-size="40px" font-weight="700" color="#5a341f">Feito para você.</mj-text>' + img + text + '<mj-button href="https://example.com" background-color="#b76b3d" border-radius="8px" inner-padding="16px 28px">Conhecer a coleção →</mj-button>') + blockDefinitions.at(-1)!.content, '#faf0e6') },
  { id: 'blank', name: 'Tela em branco', category: 'Do seu jeito', color: '#f4f4f7', subject: '', preheader: '', mjml: wrapMjml(section(title + text)) },
].map(template => ({ ...template, mjml: normalizeTemplate(template.mjml) }));
