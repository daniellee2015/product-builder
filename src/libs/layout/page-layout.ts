/**
 * Page Layout System
 * 通用页面布局结构：Header + Main Area + Footer
 */

import { menu, input, renderSimpleHeader, renderSectionHeader } from 'cli-menu-kit';

/**
 * Header 类型
 */
export type HeaderType = 'simple' | 'section' | 'none';

export interface HeaderConfig {
  type: HeaderType;
  text?: string;
  width?: number;
}

/**
 * Main Area 类型
 */
export type MainAreaType = 'menu' | 'display' | 'interactive';

/**
 * Footer 类型
 */
export interface FooterConfig {
  menu?: {
    options: string[];
    allowLetterKeys?: boolean;
    allowNumberKeys?: boolean;
  };
  input?: {
    prompt: string;
    defaultValue?: string;
  };
  ask?: {
    question: string;
    defaultValue?: boolean;
    horizontal?: boolean;
  };
  hints?: string[];
}

/**
 * 完整页面布局配置
 */
export interface PageLayoutConfig {
  header?: HeaderConfig;
  mainArea: {
    type: MainAreaType;
    render: () => void | Promise<void>;
  };
  footer?: FooterConfig;
}

/**
 * 渲染 Header
 */
function renderHeader(config?: HeaderConfig): void {
  if (!config || config.type === 'none') {
    return;
  }

  if (config.type === 'simple' && config.text) {
    renderSimpleHeader(config.text);
  } else if (config.type === 'section' && config.text) {
    renderSectionHeader(config.text, config.width || 50);
  }
}

/**
 * 渲染 Footer
 * 返回用户的选择结果
 */
async function renderFooter(config?: FooterConfig): Promise<any> {
  if (!config) {
    return null;
  }

  let result: any = null;

  // 1. Menu (如果有)
  if (config.menu) {
    result = await menu.radio({
      options: config.menu.options,
      allowLetterKeys: config.menu.allowLetterKeys ?? true,
      allowNumberKeys: config.menu.allowNumberKeys ?? true,
      hints: config.hints,
      preserveOnSelect: true
    });
  }
  // 2. Input (如果有)
  else if (config.input) {
    result = await input.text({
      prompt: config.input.prompt,
      defaultValue: config.input.defaultValue,
      allowEmpty: false
    });
  }

  // 3. Ask (如果有 - 通常在 Menu 或 Input 之后)
  if (config.ask) {
    const askResult = config.ask.horizontal
      ? await menu.booleanH(config.ask.question, config.ask.defaultValue ?? false)
      : await menu.booleanV(config.ask.question, config.ask.defaultValue ?? false);

    return { ...result, confirmed: askResult };
  }

  return result;
}

/**
 * 渲染完整页面
 */
export async function renderPage(config: PageLayoutConfig): Promise<any> {
  // 1. Render Header
  renderHeader(config.header);

  // 2. Render Main Area
  await config.mainArea.render();

  // 3. Render Footer
  const footerResult = await renderFooter(config.footer);

  return footerResult;
}
