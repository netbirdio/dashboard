import React from 'react';
import { Layout } from 'antd';

const { Footer } = Layout

export default () => {
  return (
      <Footer style={{ textAlign: 'center', position: "sticky", bottom: "0"}}>
          Copyright © 2022 <a href="https://netbird.io">NetBird Authors</a>
      </Footer>
  );
};