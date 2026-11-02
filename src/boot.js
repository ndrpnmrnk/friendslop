// Точка входа (v0.64): сначала аккаунт - профиль попадает в хранилище до чтения коллекции, потом сама игра.
import { bootAccount, startAccountSync } from './net/account.js';
await bootAccount().catch(e => console.error(e));
startAccountSync();
await import('./main.js');
