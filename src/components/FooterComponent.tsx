import React from 'react';
import { Layout } from 'antd';
import {Link} from 'react-router-dom';

const { Footer } = Layout

export default () => {
  return (
      <Footer style={{ textAlign: 'center' }}>
          Copyright © 2021 <a href="https://wiretrustee.com">Wiretrustee Authors</a>
      </Footer>
  );
};