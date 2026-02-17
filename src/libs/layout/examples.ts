/**
 * Page Layout Usage Examples
 */

import { renderPage, generateMenuHints, generateInputHints } from 'cli-menu-kit';
import { displayWorkflow } from '../../cli/workflow/display';

/**
 * Example 1: Display type page (View Workflow)
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
      hints: generateMenuHints({ allowLetterKeys: true })
    }
  });

  return result;
}

/**
 * Example 2: Interactive type page (Edit Workflow)
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
        // Checkbox menu renders here
        // Returns selected steps
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
      hints: generateMenuHints({
        hasMultipleOptions: true,
        allowNumberKeys: true,
        allowLetterKeys: true
      })
    }
  });

  return result;
}

/**
 * Example 3: Page with confirmation
 * Header + Interactive + Footer(Menu + Ask + Hint)
 */
export async function exampleWithConfirmation(data: any, hasChanges: boolean) {
  // Step 1: Show main page
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
      hints: generateMenuHints({ hasMultipleOptions: true, allowNumberKeys: true })
    }
  });

  // Step 2: If confirmation needed
  if (hasChanges && (result.index === 1 || result.index === 2)) {
    const confirmResult = await renderPage({
      header: {
        type: 'none'
      },
      mainArea: {
        type: 'display',
        render: () => {
          // No content
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
 * Example 4: Input type page
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
      hints: generateInputHints()
    }
  });

  return result;
}
