import { getCurrentUser, verifyPassword } from "@deera/shared/features/auth/hooks";
import { useMoveStokLokasiMutation } from "./queries";

export function useMoveStokLokasi() {
  const { mutateAsync } = useMoveStokLokasiMutation();

  return async ({
    fromLocation,
    toLocation,
    password,
  }: {
    fromLocation: string;
    toLocation: string;
    password: string;
  }) => {
    const user = await getCurrentUser();
    if (!user?.email) throw new Error("Sesi login tidak ditemukan, silakan login ulang.");

    const passwordOk = await verifyPassword(user.email, password);
    if (!passwordOk) throw new Error("Password salah.");

    return mutateAsync({ fromLocation, toLocation });
  };
}
