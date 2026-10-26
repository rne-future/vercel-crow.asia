export class ServiceError extends Error {
  constructor(public status: number, message: string, public code = "request_failed") {
    super(message);
    this.name = "ServiceError";
  }
}
