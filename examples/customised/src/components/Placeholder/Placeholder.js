import React, { Component } from 'react';
import PropTypes from 'prop-types';

import s from './Placeholder.module.css';

/**
 * Image placeholders.
 */
export default class Placeholder extends Component {
	static propTypes = {
		type: PropTypes.oneOf([
			'animal',
			'bacon',
			'beard',
			'bear',
			'cat',
			'food',
			'city',
			'nature',
			'people',
		]),
		width: PropTypes.number,
		height: PropTypes.number,
		alt: PropTypes.string,
	};

	static defaultProps = {
		type: 'animal',
		width: 150,
		height: 150,
		alt: 'Photo of an animal',
	};

	getImageUrl() {
		const { type, width, height } = this.props;
		const types = {
			animal: `https://picsum.photos/seed/animal/${width}/${height}`,
			bacon: `https://picsum.photos/seed/bacon/${width}/${height}`,
			bear: `https://picsum.photos/seed/bear/${width}/${height}`,
			beard: `https://picsum.photos/seed/beard/${width}/${height}`,
			cat: `https://picsum.photos/seed/cats/${width}/${height}`,
			city: `https://picsum.photos/seed/city/${width}/${height}`,
			food: `https://picsum.photos/seed/food/${width}/${height}`,
			nature: `https://picsum.photos/seed/nature/${width}/${height}`,
			people: `https://picsum.photos/seed/people/${width}/${height}`,
		};
		return types[type];
	}

	render() {
		const { width, height, alt } = this.props;
		return (
			<img className={s.root} src={this.getImageUrl()} width={width} height={height} alt={alt} />
		);
	}
}
