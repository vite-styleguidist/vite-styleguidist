import clsx from 'clsx';
import styles from './Column.module.css';

// Thin wrappers over Infima's grid (`.row` / `.col--N`), which the classic theme ships.

export const Row = ({ children, className, as: Component = 'div', ...rest }) => (
	<Component className={clsx('row', className)} {...rest}>
		{children}
	</Component>
);

// size: 1..12 (Infima columns); order: 2 puts the column last on wide screens only
export const Column = ({ children, size, order, className, as: Component = 'div', ...rest }) => (
	<Component
		className={clsx('col', `col--${size}`, order && styles[`col--order-${order}`], className)}
		{...rest}
	>
		{children}
	</Component>
);
