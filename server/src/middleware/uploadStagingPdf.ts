import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { BadRequestError } from '../utilities/httpErrors';

const MAX_PDF_BYTES = 15 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype === 'application/pdf') {
      callback(null, true);
      return;
    }
    callback(new BadRequestError('Only application/pdf uploads are allowed'));
  },
});

export function optionalStagingPdfUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.includes('multipart/form-data')) {
    next();
    return;
  }

  upload.single('file')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new BadRequestError('PDF file exceeds 15MB limit'));
        return;
      }
      next(new BadRequestError(error.message));
      return;
    }
    if (error) {
      next(error);
      return;
    }
    next();
  });
}
