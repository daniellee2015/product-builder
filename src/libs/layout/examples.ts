/**
 * Page Layout 使用示例
 */

import { renderPage } from './page-layout';
import { displayWorkflow } from '../../cli/workflow/display';

/**
 * 示例 1: Display 类型页面 (View Workflow)
 * Header + Display + Footer(Menu + Hint)
 */
export async function exampleDisplayPage(data: any) {
  const result = await renderPage({
    // Header
    header: {
      type: 'simple',
      text: 'View Workflow'
    },

    // Main Area: Display
    mainArea: {
      type: 'display',
      render: () => {
        displayWorkflow(data);
      }
    },

    // Footer: Menu + Hint
    footer: {
      menu: {
        options: ['b. Back'],
        allowLetterKeys: true
      },
      hints: ['b Back']
    }
  });

  return result;
}

/**
 * 示例 2: Interactive 类型页面 (Edit Workflow)
 * Header + Interactive + Footer(Menu + Hint)
 */
export async function exampleInteractivePage(data: any) {
  const result = await renderPage({
    // Header
    header: {
      type: 'section',
      text: 'Edit Workflow',
      width: 50
    },

    // Main Area: Interactive (checkbox menu)
    mainArea: {
      type: 'interactive',
      render: async () => {
        // Checkbox menu 在这里渲染
        // 返回选中的步骤
      }
    },

    // Footer: Menu + Hint
    footer: {
      menu: {
        options: [
          '1. Save changes',
          '2. Cancel',
          'b. Back'
        ],
        allowNumberKeys: true,
        allowLetterKeys: true
      },
      hints: ['↑↓ Navigate  Enter Confirm  b Back']
    }
  });

  return result;
}

/**
 * 示例 3: 带二次确认的页面
 * Header + Interactive + Footer(Menu + Ask + Hint)
 */
export async function exampleWithConfirmation(data: any, hasChanges: boolean) {
  // Step 1: 显示主页面
  const result = await renderPage({
    header: {
      type: 'section',
      text: 'Edit Workflow'
    },
    mainArea: {
      type: 'interactive',
      render: async () => {
        // Interactive content
      }
    },
    footer: {
      menu: {
        options: ['1. Save', '2. Cancel', 'b. Back']
      },
      hints: ['↑↓ Navigate  Enter Confirm']
    }
  });

  // Step 2: 如果需要确认
  if (hasChanges && (result.index === 1 || result.index === 2)) {
    const confirmResult = await renderPage({
      header: {
        type: 'none'
      },
      mainArea: {
        type: 'display',
        render: () => {
          // 不显示内容
        }
      },
      footer: {
        ask: {
          question: 'You have unsaved changes. Discard them?',
          defaultValue: false,
          horizontal: true
        }
      }
    });

    return { ...result, confirmed: confirmResult };
  }

  return result;
}

/**
 * 示例 4: Input 类型页面
 * Header + Display + Footer(Input + Hint)
 */
export async function exampleInputPage() {
  const result = await renderPage({
    header: {
      type: 'simple',
      text: 'Export Workflow'
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log('  Enter a name for your workflow configuration');
      }
    },
    footer: {
      input: {
        prompt: 'Workflow name',
        defaultValue: 'custom-workflow'
      },
      hints: ['Enter to submit  Esc to cancel']
    }
  });

  return result;
}
