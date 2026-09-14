import React from 'react';
import './styles.css';

/** The tones a badge can take. */
export enum BadgeTone {
	Neutral = 'neutral',
	Success = 'success',
	Warning = 'warning',
}

interface BadgeProps {
	/** Tone of the badge. */
	tone?: BadgeTone;
	/** Number shown in the badge. */
	count: number;
	/** Largest number rendered as-is; anything above it is rendered as `max+`. */
	max?: number;
}

/**
 * A count badge, written as a `React.FC` with an `enum` prop and its props
 * declared in a non-exported interface.
 */
const Badge: React.FC<BadgeProps> = ({ tone = BadgeTone.Neutral, count, max = 99 }) => (
	<span className="rsg-ts-badge" data-tone={tone}>
		{count > max ? `${max}+` : count}
	</span>
);

export default Badge;
