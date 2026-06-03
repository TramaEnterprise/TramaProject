import { Upload } from "lucide-react";

type AvatarUploaderProps = {
  previewUrl: string | null;
  onFileSelected: (file: File) => void;
};

export default function AvatarUploader({ previewUrl, onFileSelected }: AvatarUploaderProps) {
  const forwardSelectedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <div className="edit-profile__field">
      <span className="edit-profile__label">Foto de perfil</span>
      <div className="edit-profile__photo-upload">
        <label className="edit-profile__photo-preview" htmlFor="avatar-input">
          {previewUrl ? (
            <img src={previewUrl} alt="Foto de perfil" className="edit-profile__photo-img" />
          ) : (
            <span className="edit-profile__upload-hint">Foto</span>
          )}
          <div className="edit-profile__photo-overlay">
            <Upload size={20} aria-hidden="true" />
          </div>
        </label>
        <input
          id="avatar-input"
          type="file"
          accept="image/*"
          className="edit-profile__file-input"
          onChange={forwardSelectedFile}
          aria-label="Subir foto de perfil"
        />
      </div>
    </div>
  );
}
