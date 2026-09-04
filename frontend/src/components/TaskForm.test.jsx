import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskForm from './TaskForm';

describe("Formulaire d'ajout de tâche", () => {
  test("bloque l'ajout d'une tâche vide", async () => {
    const onAdd = vi.fn();
    render(<TaskForm onAdd={onAdd} />);

    await userEvent.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/titre/i);
    expect(onAdd).not.toHaveBeenCalled();
  });

  test('envoie le titre nettoyé et vide le champ après ajout', async () => {
    const onAdd = vi.fn().mockResolvedValue();
    render(<TaskForm onAdd={onAdd} />);
    const input = screen.getByLabelText(/titre/i);

    await userEvent.type(input, '  Acheter du pain  ');
    await userEvent.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(onAdd).toHaveBeenCalledWith({ title: 'Acheter du pain' });
    await waitFor(() => expect(input).toHaveValue(''));
  });

  test("affiche l'erreur renvoyée par l'API", async () => {
    const onAdd = vi
      .fn()
      .mockRejectedValue({ response: { status: 400, data: { msg: 'Données invalides' } } });
    render(<TaskForm onAdd={onAdd} />);

    await userEvent.type(screen.getByLabelText(/titre/i), 'Test');
    await userEvent.click(screen.getByRole('button', { name: /ajouter/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Données invalides');
  });
});
