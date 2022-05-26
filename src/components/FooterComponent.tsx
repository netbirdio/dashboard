import React, { Link } from 'react';
import { Footer } from 'antd';

export default FooterComponent = () => {
  return (
      <Footer style={{ textAlign: 'center' }}>
          Copyright © 2021 <Link to="https://wiretrustee.com">Wiretrustee Authors</Link>
      </Footer>
  );
};