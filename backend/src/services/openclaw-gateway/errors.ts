export class OpenClawGatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenClawGatewayError';
  }
}
