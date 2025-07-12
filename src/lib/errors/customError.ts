export class CustomError extends Error {
  statusCode: number;
  status: boolean;
  errorType: string;

  constructor(
    message: string,
    statusCode: number,
    errorType: string = "Error",
    status: boolean = false
  ) {
    super(message);
    this.statusCode = statusCode;
    this.status = status;
    this.errorType = errorType;

    
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}
