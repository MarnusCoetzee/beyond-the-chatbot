import { killPort } from '@nx/node/utils';
/* eslint-disable */

module.exports = async function () {
  // Put clean up logic here (e.g. stopping services, docker-compose, etc.).
  // Hint: globalThis is shared between setup and teardown.
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await killPort(port);

  const teardownMessage = (globalThis as typeof globalThis & { __TEARDOWN_MESSAGE__?: string })
    .__TEARDOWN_MESSAGE__;

  if (teardownMessage) {
    console.log(teardownMessage);
  }
};
