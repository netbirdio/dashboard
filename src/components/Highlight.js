import React, { Component } from "react";
import PropTypes from "prop-types";

import hljs from "highlight.js";
import "highlight.js/styles/agate.css";
import "highlight.js/lib/languages/bash";

class Highlight extends Component {
  constructor(props) {
    super(props);

    this.state = { loaded: false };
    this.codeNode = React.createRef();
  }

  componentDidMount() {
    this.setState({ loaded: true });
  }

  componentDidUpdate() {
    this.highlight();
  }

  highlight = () => {
    this.codeNode &&
      this.codeNode.current &&
      hljs.highlightElement(this.codeNode.current);
  };

  render() {
    const { language, children } = this.props;
    const { loaded } = this.state;

    if (!loaded) {
      return null;
    }

    return (
      <pre className="rounded">
        <code ref={this.codeNode} className={language}>
          {children}
        </code>
      </pre>
    );
  }
}

Highlight.propTypes = {
  children: PropTypes.node.isRequired,
  language: PropTypes.string,
};

export default Highlight;
