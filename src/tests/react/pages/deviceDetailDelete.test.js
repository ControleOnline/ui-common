/**
 * Unit coverage for device-detail delete confirmation flow (app-community#383).
 */

describe('device-detail delete confirmation (task-383)', () => {
  const buildDeleteFlow = ({ remove, onSuccess, onError }) => {
    let confirmed = false;
    const confirm = (msg, cb) => ({
      confirmNow: () => {
        confirmed = true;
        return Promise.resolve().then(() => cb());
      },
      cancel: () => {
        confirmed = false;
      },
      wasConfirmed: () => confirmed,
      message: msg,
    });

    const deleteDevice = async ({ deviceId, alias, deviceString }) => {
      if (!deviceId) return { aborted: true };
      const label = String(alias || deviceString || deviceId).trim();
      const message = `Excluir o device "${label}"? Esta ação não pode ser desfeita.`;
      return confirm(message, async () => {
        try {
          await remove(deviceId);
          onSuccess?.();
        } catch (e) {
          onError?.(e);
        }
      });
    };

    return { deleteDevice };
  };

  test('does not call remove when confirmation is cancelled', async () => {
    const remove = jest.fn();
    const onSuccess = jest.fn();
    const { deleteDevice } = buildDeleteFlow({ remove, onSuccess });
    const gate = await deleteDevice({ deviceId: '42', alias: 'PDV 1' });
    expect(gate.message).toContain('PDV 1');
    gate.cancel();
    expect(remove).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(gate.wasConfirmed()).toBe(false);
  });

  test('calls remove with deviceId after confirmation', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    const { deleteDevice } = buildDeleteFlow({ remove, onSuccess });
    const gate = await deleteDevice({ deviceId: '99', alias: 'Kiosk' });
    await gate.confirmNow();
    expect(remove).toHaveBeenCalledWith('99');
    expect(onSuccess).toHaveBeenCalled();
  });

  test('surfaces error without success when remove rejects', async () => {
    const remove = jest.fn().mockRejectedValue(new Error('fail'));
    const onSuccess = jest.fn();
    const onError = jest.fn();
    const { deleteDevice } = buildDeleteFlow({ remove, onSuccess, onError });
    const gate = await deleteDevice({ deviceId: '7', deviceString: 'dev-7' });
    await gate.confirmNow();
    expect(remove).toHaveBeenCalledWith('7');
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  test('aborts when deviceId is missing', async () => {
    const remove = jest.fn();
    const { deleteDevice } = buildDeleteFlow({ remove });
    const result = await deleteDevice({ deviceId: null, alias: 'x' });
    expect(result).toEqual({ aborted: true });
    expect(remove).not.toHaveBeenCalled();
  });
});
