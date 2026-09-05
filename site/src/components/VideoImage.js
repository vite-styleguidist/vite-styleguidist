import clsx from 'clsx';
import styles from './VideoImage.module.css';

// An image with a "play" overlay, for cards that link to a video.
export const VideoImage = ({ className, ...rest }) => (
	<div className={clsx(styles.container, className)}>
		<img {...rest} />
	</div>
);
