// What the whole video is about, shared by its scenes: the project, the
// instructions that get written, and the session that follows them.
import { WIN } from './kit.mjs';
import { look } from './camera.mjs';
import { CLOSE, DIALOG } from './project.mjs';

// DRAWN: the project's name and its neighbors in the sidebar.
export const PROJECT = 'storefront';
export const SIDE_PROJECTS = [['message-circle', 'Chats'], ['folder', PROJECT], ['folder', 'storefront-api'], ['folder', 'docs-site', -1.92], ['folder', 'design-tokens', -1.92]];

// The three instructions the voice names. They are the app's own example
// (the placeholder of the Instructions field in ProjectInstructionsField.tsx).
export const RULES = ['Use pnpm, not npm.', 'Prefix branch names with feat/ or fix/.', 'Run lint before committing.'];
export const PLACEHOLDER = `e.g., ${RULES.join(' ')}`;

// DRAWN: the longer guidelines pasted in under the three rules.
export const GUIDELINES = [
  '## Naming',
  '- Components are PascalCase, one per file: ProductCard.tsx.',
  '- Hooks start with "use" and live in src/hooks.',
  '- Booleans read as questions: isLoading, hasStock, canCheckout.',
  '- Event handlers are handleX, the props that take them are onX.',
  '',
  '## Structure',
  '- Group by feature: src/features/cart, src/features/checkout.',
  '- Keep data fetching in loaders, never inside components.',
  '- Shared UI goes in src/components, shared logic in src/lib.',
  '- No file over 300 lines. Split it before it gets there.',
  '',
  '## Style',
  '- TypeScript strict mode. No "any", no non-null assertions.',
  '- Prefer early returns over nested conditions.',
  '- Every new component ships with a test next to it.',
  '- Comments explain why, never what.',
].join('\n');

// DRAWN: the feature that is asked for, and the work Copilot does on it.
export const PROMPT = 'Add a wishlist button to the product page';
export const SESSION_TITLE = 'Wishlist button on product page';
export const BRANCH = 'feat/wishlist-button';
export const REPLY = 'Added a wishlist button to the product page on a new branch, `feat/wishlist-button`. `pnpm lint` passes, so it is ready to commit.';

// DRAWN: the three short asks in the opening diagram.
export const ASKS = [PROMPT, 'Fix the cart total rounding', 'Upgrade to React 19'];

// Where the settings film leaves off and the next one picks up: the camera
// on the middle of the window, and the pointer where the dialog's close
// button was.
export const CLOSE_SHOT = look(WIN.x + DIALOG.x + 480, WIN.y + DIALOG.y + 285, 1.42);
export const CLOSE_POINT = [WIN.x + DIALOG.x + CLOSE.x + 15, WIN.y + DIALOG.y + CLOSE.y + 17];
