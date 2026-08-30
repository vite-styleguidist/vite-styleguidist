import { utils } from 'react-docgen';
import type { FileState, NodePath, ResolverClass, ResolverFunction } from 'react-docgen';

type ComponentNodePath = ReturnType<ResolverFunction>[number];

/**
 * react-docgen resolver that finds *exported* values annotated with a `@component`
 * docblock, whatever they are — including styled-components tagged templates:
 *
 * ```js
 * /** @component *\/
 * export const Button = styled.button`...`;
 * ```
 *
 * react-docgen’s own `FindAnnotatedDefinitionsResolver` only looks at function and
 * class definitions, so it misses those. This is a port of the resolver that
 * `react-docgen-annotation-resolver` provided for react-docgen <= 5.
 */
export default class FindAnnotatedExportsResolver implements ResolverClass {
	private annotation: string;

	public constructor({ annotation = '@component' }: { annotation?: string } = {}) {
		this.annotation = annotation;
	}

	public resolve(file: FileState): ComponentNodePath[] {
		const found = new Set<ComponentNodePath>();
		const visit = (path: NodePath): void => {
			const comments = path.node.leadingComments;
			if (!comments || !comments.some((comment) => comment.value.includes(this.annotation))) {
				return;
			}
			utils.resolveExportDeclaration(path as any).forEach((exported) => {
				found.add(utils.resolveToValue(utils.resolveHOC(exported)) as ComponentNodePath);
			});
		};
		file.traverse({ ExportNamedDeclaration: visit, ExportDefaultDeclaration: visit });
		return Array.from(found);
	}
}
