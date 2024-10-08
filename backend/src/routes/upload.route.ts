import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { UploadService } from "../services/upload.service";
import { UploadController } from "../controllers/upload.controller";
import { uploadMiddleware } from "../middleware/multer.middleware";

class UploadRouter {
  public router: Router;
  private uploadService: UploadService;
  private uploadController: UploadController;

  constructor() {
    this.router = Router();
    this.uploadService = new UploadService();
    this.uploadController = new UploadController(this.uploadService);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      "/",
      authMiddleware,
      uploadMiddleware.single("image"),
      this.uploadController.uploadImage
    );
    this.router.delete(
      "/:id",
      authMiddleware,
      this.uploadController.deleteImage
    );
  }
}

export default new UploadRouter().router;
