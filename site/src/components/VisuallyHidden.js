import styles from './VisuallyHidden.module.css';

// Text for screen readers only (e.g. a section heading the layout does not show).
export const VisuallyHidden = ({ children, as: Component = 'span', ...rest }) => (
	<Component className={styles.visuallyHidden} {...rest}>
		{children}
	</Component>
);
