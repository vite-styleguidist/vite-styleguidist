import clsx from 'clsx';
import styles from './Box.module.css';

// textAlign: 'center' | undefined
export const Box = ({ children, textAlign, className, as: Component = 'div', ...rest }) => (
	<Component
		className={clsx(styles.box, textAlign && styles[`box--textAlign-${textAlign}`], className)}
		{...rest}
	>
		{children}
	</Component>
);
