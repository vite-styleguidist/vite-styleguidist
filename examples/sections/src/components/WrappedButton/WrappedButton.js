import React from 'react';
import Button from '../Button';

/**
 * A button wrapped by a Decorator/Enhancer
 */
const WrappedButton = (props) => <Button {...props} />;

// react-docgen names a component after the definition it resolves to. It used to follow
// `dummyWrapper(Button)` into the imported Button and call this component "Button", which
// put two components under that name: the sidebar and #!/Button showed both, and the
// example below (evaluated with the component bound under its documented name) failed with
// "WrappedButton is not defined". Keep the wrapper local, and the display name explicit.
WrappedButton.displayName = 'WrappedButton';

export default WrappedButton;
