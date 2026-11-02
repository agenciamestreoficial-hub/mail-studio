import type { Component } from 'grapesjs';
import { COUNTDOWN_PATH, countdownUrl, deadlineLabel, defaultCountdown, readCountdownUrl, type CountdownConfig } from '../countdown/config';
import { escapeXml } from './security';
export function isCountdown(component?: Component): boolean {
  return component?.get('type') === 'mj-section' && String(component.getAttributes()['css-class'] || '').split(/\s+/).includes('ms-countdown');
}
export function countdownAncestor(component?: Component): Component | undefined {
  if (!component) return;
  return isCountdown(component) ? component : countdownAncestor(component.parent());
}
export function countdownBlock(endpoint = COUNTDOWN_PATH, config = defaultCountdown()) {
  return `<mj-section css-class="ms-countdown" background-color="#ffffff" padding="20px 0"><mj-column><mj-image src="${escapeXml(countdownUrl(config, endpoint))}" alt="${escapeXml(deadlineLabel(config))}" padding="8px 28px" width="540px"></mj-image><mj-text css-class="ms-countdown-deadline" align="center" color="#777088" font-size="12px" padding="8px 28px">${escapeXml(deadlineLabel(config))}</mj-text></mj-column></mj-section>`;
}
export function readCountdown(component: Component) {
  const image = component.findType('mj-image')[0];
  if (!image) throw new Error('Imagem do cronômetro não encontrada.');
  return readCountdownUrl(image.getAttributes().src || image.get('src'));
}
export function updateCountdown(component: Component, config: CountdownConfig, endpoint: string) {
  const src = countdownUrl(config, endpoint);
  const image = component.findType('mj-image')[0];
  if (!image) throw new Error('Imagem do cronômetro não encontrada.');
  image.addAttributes({ src, alt: deadlineLabel(config) });
  image.set('src', src);
  const caption = component.findType('mj-text').find(c => c.getAttributes()['css-class'] === 'ms-countdown-deadline');
  if (caption) { caption.set('content', ''); caption.components(escapeXml(deadlineLabel(config))); }
}
export function countdownWarnings(components: Component[]): string[] {
  const warnings = new Set<string>();
  for (const component of components.filter(isCountdown)) {
    try {
      const { config, endpoint } = readCountdown(component);
      if (endpoint === COUNTDOWN_PATH) warnings.add('Cronômetro em modo local: configure a URL HTTPS pública do serviço antes de enviar este HTML.');
      if (Date.parse(config.end) <= Date.now()) warnings.add('Um cronômetro está com o prazo encerrado. Revise a data antes de enviar.');
    } catch { warnings.add('Um cronômetro está inválido. Revise sua configuração.'); }
  }
  return [...warnings];
}
