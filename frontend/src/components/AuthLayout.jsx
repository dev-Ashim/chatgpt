import { Link } from 'react-router-dom'

const AuthLayout = ({ eyebrow, title, description, footerText, footerLabel, footerTo, children }) => {
	return (
		<main className="auth-shell">
			<aside className="auth-showcase">
				<Link className="brand showcase-brand" to="/">ChatSpace</Link>
				<div className="showcase-content">
					<p className="showcase-kicker">A little closer, even from afar</p>
					<h2>Good conversations start with a hello.</h2>
					<div className="chat-preview" aria-hidden="true">
						<div className="preview-heading">
							<span className="preview-avatar">M</span>
							<span>Monday circle<small>4 people</small></span>
						</div>
						<div className="preview-message preview-message-incoming">Made it home. Thanks for tonight.</div>
						<div className="preview-message preview-message-outgoing">Already looking forward to next time.</div>
					</div>
				</div>
				<p className="showcase-footnote">Your conversations have a place here.</p>
			</aside>
			<section className="auth-main">
				<div className="auth-content">
					<header className="auth-heading">
						<p className="eyebrow">{eyebrow}</p>
						<h1>{title}</h1>
						<p className="intro">{description}</p>
					</header>
					{children}
					<p className="auth-switch">
						{footerText} <Link to={footerTo}>{footerLabel}</Link>
					</p>
				</div>
			</section>
		</main>
	)
}

export default AuthLayout