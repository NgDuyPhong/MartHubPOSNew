import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePosNoticeState } from '../hooks/use-pos-notice';
import { createPosNotice } from '../model/notices';
import type { CartLine } from '../model/types';
import { PosNotices } from './pos-notices';

const placeholderCartLine = {} as CartLine;

function OwnerHarness() {
    const { message, undoCart, setUndoCart, setPosMessage, showNotice } = usePosNoticeState();

    return (
        <>
            <output data-testid="undo-count">{undoCart.length}</output>
            <button
                type="button"
                onClick={() => {
                    setUndoCart([placeholderCartLine]);
                    showNotice('Đã xóa hóa đơn hiện tại', 'info', { autoDismissMs: 1000, kind: 'cart-cleared' });
                }}
            >
                Xóa giỏ
            </button>
            <button type="button" onClick={() => showNotice('Notice mới', 'success')}>
                Thay notice
            </button>
            <PosNotices
                message={message}
                undoCartCount={undoCart.length}
                hasStaleCartPrice={false}
                unavailableCartLineCount={0}
                onUndo={() => setPosMessage(null)}
                onDismiss={() => setPosMessage(null)}
            />
        </>
    );
}

afterEach(() => {
    vi.useRealTimers();
});

describe('PosNotices', () => {
    it('renders only the relevant operational notices', async () => {
        const onUndo = vi.fn();
        const onDismiss = vi.fn();

        render(
            <PosNotices
                message={createPosNotice('Đã xóa hóa đơn hiện tại', 'info', { kind: 'cart-cleared' })}
                undoCartCount={1}
                hasStaleCartPrice
                unavailableCartLineCount={2}
                onUndo={onUndo}
                onDismiss={onDismiss}
            />,
        );

        expect(screen.getAllByRole('status').some((element) => element.textContent?.includes('Đã xóa hóa đơn hiện tại'))).toBe(true);
        expect(screen.getByRole('alert')).toHaveTextContent('2 dòng hàng');

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'Hoàn tác' }));
        await user.click(screen.getByRole('button', { name: 'Đóng' }));

        expect(onUndo).toHaveBeenCalledOnce();
        expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('renders nothing when there are no notices', () => {
        const { container } = render(
            <PosNotices
                message={null}
                undoCartCount={0}
                hasStaleCartPrice={false}
                unavailableCartLineCount={0}
                onUndo={() => undefined}
                onDismiss={() => undefined}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('auto-dismisses transient notices after the configured duration', () => {
        vi.useFakeTimers();
        const onDismiss = vi.fn();

        render(
            <PosNotices
                message={createPosNotice('Đã tạo khách hàng', 'success', { autoDismissMs: 1000 })}
                undoCartCount={0}
                hasStaleCartPrice={false}
                unavailableCartLineCount={0}
                onUndo={() => undefined}
                onDismiss={onDismiss}
            />,
        );

        expect(screen.getByText('Đã tạo khách hàng')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(onDismiss).toHaveBeenCalledOnce();
        expect(screen.queryByText('Đã tạo khách hàng')).not.toBeInTheDocument();
    });

    it('keeps persistent warning notices visible after timers advance', () => {
        vi.useFakeTimers();

        render(
            <PosNotices
                message={createPosNotice('Catalog đang chờ làm mới', 'warning')}
                undoCartCount={0}
                hasStaleCartPrice={false}
                unavailableCartLineCount={0}
                onUndo={() => undefined}
                onDismiss={() => undefined}
            />,
        );

        act(() => {
            vi.advanceTimersByTime(10000);
        });

        expect(screen.getByRole('status')).toHaveTextContent('Catalog đang chờ làm mới');
    });

    it('pauses the timeout while the notice is hovered', () => {
        vi.useFakeTimers();

        render(
            <PosNotices
                message={createPosNotice('Có thể hoàn tác', 'info', { autoDismissMs: 1000 })}
                undoCartCount={1}
                hasStaleCartPrice={false}
                unavailableCartLineCount={0}
                onUndo={() => undefined}
                onDismiss={() => undefined}
            />,
        );

        const notice = screen.getByRole('status');
        fireEvent.mouseEnter(notice);

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(screen.getByText('Có thể hoàn tác')).toBeInTheDocument();

        fireEvent.mouseLeave(notice);
        act(() => {
            vi.advanceTimersByTime(999);
        });
        expect(screen.getByText('Có thể hoàn tác')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(screen.queryByText('Có thể hoàn tác')).not.toBeInTheDocument();
    });

    it('pauses the timeout while an action has keyboard focus', () => {
        vi.useFakeTimers();

        render(
            <PosNotices
                message={createPosNotice('Có thể hoàn tác bằng bàn phím', 'info', { autoDismissMs: 1000, kind: 'cart-cleared' })}
                undoCartCount={1}
                hasStaleCartPrice={false}
                unavailableCartLineCount={0}
                onUndo={() => undefined}
                onDismiss={() => undefined}
            />,
        );

        const notice = screen.getByRole('status');
        const undoButton = screen.getByRole('button', { name: 'Hoàn tác' });
        fireEvent.focus(undoButton);

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(screen.getByText('Có thể hoàn tác bằng bàn phím')).toBeInTheDocument();

        fireEvent.blur(undoButton, { relatedTarget: null });
        act(() => {
            vi.advanceTimersByTime(999);
        });
        expect(screen.getByText('Có thể hoàn tác bằng bàn phím')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(screen.queryByText('Có thể hoàn tác bằng bàn phím')).not.toBeInTheDocument();
        expect(notice).not.toBeInTheDocument();
    });

    it.each([
        ['info', 'status', 'text-info-muted-foreground', 'polite'],
        ['success', 'status', 'text-success-muted-foreground', 'polite'],
        ['warning', 'status', 'text-warning-muted-foreground', 'polite'],
        ['error', 'alert', 'text-destructive', 'assertive'],
    ] as const)('renders the %s tone with its semantic class and live region', (tone, role, foregroundClass, live) => {
        render(
            <PosNotices
                message={createPosNotice(`${tone} message`, tone)}
                undoCartCount={0}
                hasStaleCartPrice={false}
                unavailableCartLineCount={0}
                onUndo={() => undefined}
                onDismiss={() => undefined}
            />,
        );

        const notice = screen.getByRole(role);
        expect(notice).toHaveClass(foregroundClass);
        expect(notice).toHaveAttribute('aria-live', live);
        expect(notice).toHaveAttribute('aria-atomic', 'true');
        expect(notice).toHaveClass('flex-wrap');
        expect(screen.getByRole('button', { name: 'Đóng' }).parentElement).toHaveClass('w-full', 'sm:w-auto');
    });

    it('resets the timeout when a new notice replaces the current one', () => {
        vi.useFakeTimers();
        const onDismiss = vi.fn();
        const firstNotice = createPosNotice('Đang xử lý', 'info', { autoDismissMs: 1000 });
        const { rerender } = render(
            <PosNotices
                message={firstNotice}
                undoCartCount={0}
                hasStaleCartPrice={false}
                unavailableCartLineCount={0}
                onUndo={() => undefined}
                onDismiss={onDismiss}
            />,
        );

        act(() => {
            vi.advanceTimersByTime(750);
        });

        rerender(
            <PosNotices
                message={createPosNotice('Đang xử lý', 'info', { autoDismissMs: 1000 })}
                undoCartCount={0}
                hasStaleCartPrice={false}
                unavailableCartLineCount={0}
                onUndo={() => undefined}
                onDismiss={onDismiss}
            />,
        );

        act(() => {
            vi.advanceTimersByTime(250);
        });
        expect(screen.getByText('Đang xử lý')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(750);
        });
        expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('keeps derived operational notices visible when a transient notice expires', () => {
        vi.useFakeTimers();

        render(
            <PosNotices
                message={createPosNotice('Đã đổi quy cách', 'info', { autoDismissMs: 1000 })}
                undoCartCount={0}
                hasStaleCartPrice
                unavailableCartLineCount={1}
                onUndo={() => undefined}
                onDismiss={() => undefined}
            />,
        );

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(screen.getByText(/Giá catalog đã thay đổi/)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent('1 dòng hàng');
    });
});

describe('PosNotices owner lifecycle', () => {
    it('clears the owner undo snapshot after timeout', () => {
        vi.useFakeTimers();
        render(<OwnerHarness />);

        fireEvent.click(screen.getByRole('button', { name: 'Xóa giỏ' }));
        expect(screen.getByTestId('undo-count')).toHaveTextContent('1');

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(screen.getByTestId('undo-count')).toHaveTextContent('0');
    });

    it('clears the owner undo snapshot after manual dismiss', () => {
        render(<OwnerHarness />);

        fireEvent.click(screen.getByRole('button', { name: 'Xóa giỏ' }));
        fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));

        expect(screen.getByTestId('undo-count')).toHaveTextContent('0');
    });

    it('clears the owner undo snapshot when another notice replaces cart-cleared', () => {
        render(<OwnerHarness />);

        fireEvent.click(screen.getByRole('button', { name: 'Xóa giỏ' }));
        expect(screen.getByTestId('undo-count')).toHaveTextContent('1');

        fireEvent.click(screen.getByRole('button', { name: 'Thay notice' }));

        expect(screen.getByTestId('undo-count')).toHaveTextContent('0');
        expect(screen.getByText('Notice mới')).toBeInTheDocument();
    });
});
