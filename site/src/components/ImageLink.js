import clsx from 'clsx';
import styles from './ImageLink.module.css';

// A link wrapping an image, opened in a new tab (used for the example style guides,
// which are separate apps, and for third-party sites).
export const ImageLink = ({ children, className, ...rest }) => (
	<a className={clsx(styles.link, className)} target="_blank" rel="noopener noreferrer" {...rest}>
		{children}
	</a>
);
