import clsx from 'clsx';
import styles from './Stack.module.css';

// Vertical stack with a fixed gap between children.
// gap: 'xxs' | 'xs' | 's' | 'm' | 'l' | 'xl' (see Stack.module.css)
export const Stack = ({ children, gap, className, as: Component = 'div', ...rest }) => (
	<Component className={clsx(styles.stack, styles[`stack--${gap}`], className)} {...rest}>
		{children}
	</Component>
);
