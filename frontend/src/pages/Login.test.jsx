import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import { AuthContext } from '../context/auth-context';

function renderLogin(login = vi.fn()) {
  const value = {
    user: null,
    loading: false,
    isAuthenticated: false,
    sessionNotice: '',
    login,
    register: vi.fn(),
    logout: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('Page de connexion', () => {
  test('refuse un formulaire vide et affiche un message', async () => {
    const login = vi.fn();
    renderLogin(login);

    await userEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/nom d'utilisateur/i);
    expect(login).not.toHaveBeenCalled();
  });

  test("affiche le message d'erreur renvoyé par le serveur", async () => {
    const login = vi
      .fn()
      .mockRejectedValue({ response: { status: 401, data: { msg: 'Identifiants invalides' } } });
    renderLogin(login);

    await userEvent.type(screen.getByLabelText(/nom d'utilisateur/i), 'alice');
    await userEvent.type(screen.getByLabelText(/mot de passe/i), 'mauvais');
    await userEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Identifiants invalides');
    expect(login).toHaveBeenCalledWith('alice', 'mauvais');
  });
});
