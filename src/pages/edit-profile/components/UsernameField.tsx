import type { FieldError, UseFormRegister } from "react-hook-form";
import type { UsernameStatus } from "@/hooks/useUsernameAvailability";
import type { EditProfileForm } from "../EditProfilePage";

type UsernameFieldProps = {
  register: UseFormRegister<EditProfileForm>;
  error: FieldError | undefined;
  status: UsernameStatus;
};

export default function UsernameField({ register, error, status }: UsernameFieldProps) {
  return (
    <div className="edit-profile__field">
      <label className="edit-profile__label" htmlFor="username">
        Nickname
      </label>
      <div className="edit-profile__input-prefix-wrap">
        <span className="edit-profile__prefix">@</span>
        <input
          id="username"
          className="edit-profile__input edit-profile__input--with-prefix"
          type="text"
          {...register("username", {
            pattern: {
              value: /^[a-z0-9_]{3,20}$/,
              message: "Solo letras minúsculas, números y _, entre 3 y 20 caracteres",
            },
          })}
        />
      </div>
      {error && <p className="edit-profile__error">{error.message}</p>}
      {status === "checking" && <p className="edit-profile__hint">Comprobando disponibilidad…</p>}
      {status === "taken" && <p className="edit-profile__error">Este nombre ya está en uso</p>}
      {status === "available" && <p className="edit-profile__success">Disponible</p>}
    </div>
  );
}
