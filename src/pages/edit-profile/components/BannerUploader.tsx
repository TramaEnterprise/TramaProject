import { Upload } from "lucide-react";

type BannerUploaderProps = {
  previewUrl: string | null;
  onFileSelected: (file: File) => void;
};

export default function BannerUploader({ previewUrl, onFileSelected }: BannerUploaderProps) {
  const forwardSelectedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div className="edit-profile__field">
      <span className="edit-profile__label">Foto de portada</span>
      <div className="edit-profile__banner-upload">
        <label
          className="edit-profile__banner-preview"
          htmlFor="banner-input"
          style={previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined}
        >
          {!previewUrl && <span className="edit-profile__upload-hint">Subir portada</span>}
          <div className="edit-profile__banner-overlay">
            <Upload size={24} aria-hidden="true" />
          </div>
        </label>
        <input
          id="banner-input"
          type="file"
          accept="image/*"
          className="edit-profile__file-input"
          onChange={forwardSelectedFile}
          aria-label="Subir imagen de portada"
        />
      </div>
    </div>
  );
}
