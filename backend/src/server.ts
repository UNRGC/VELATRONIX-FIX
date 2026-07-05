import { buildApp } from './app';
import { env } from './env';

buildApp().listen(env.port, () => {
  console.log(`API escuchando en http://localhost:${env.port}`);
});
