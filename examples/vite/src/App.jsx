import React, { useState } from 'react';
import Button from './components/Button';
import Card from './components/Card';

export default function App() {
	const [count, setCount] = useState(0);
	return (
		<main style={{ padding: 32 }}>
			<Card title="Vite + React + Styleguidist">
				<p>
					Run <code>npx styleguidist server</code> to see the documentation of the components used
					on this page.
				</p>
				<Button onClick={() => setCount(count + 1)}>Clicked {count} times</Button>
			</Card>
		</main>
	);
}
