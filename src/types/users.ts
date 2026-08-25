export interface CurrentUser {
  name: string | null;
  email: string;
  image: string | null;
}

/**
 * The signed-in user as the profile page needs them. `hasPassword` is derived
 * from the bcrypt hash rather than exposing it — an account can hold both a
 * password and a linked GitHub account, so "signed up with email" is not the
 * same question as "has no OAuth account".
 */
export interface ProfileUser extends CurrentUser {
  createdAt: Date;
  hasPassword: boolean;
}
