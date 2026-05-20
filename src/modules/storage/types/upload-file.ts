export type UploadFile = {
  buffer: Buffer;
  mimeType: string;
  size: number;
  originalName?: string;
};
