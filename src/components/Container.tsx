import styled from 'styled-components'

export const Container = styled.div`
  max-width: 100%;
  margin: 0 auto;
  //padding: 0 1rem;
  padding: 0;

  @media (max-width: 384px) {
    max-width: 100%;
        padding: 0 16px;
  }

  @media (min-width: 384px) {
    max-width: 100%;
    padding: 0 16px;
  }
  
  @media (min-width: 576px) {
    max-width: 576px;
  }

  @media (min-width: 768px) {
    max-width: 768px;
  }

  @media (min-width: 992px) {
    max-width: 992px;
  }

  @media (min-width: 1216px) {
    max-width: 1216px;
  }
`